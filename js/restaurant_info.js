let restaurant;
var map;

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.map = new google.maps.Map(document.getElementById('map'), {
        zoom: 16,
        center: restaurant.latlng,
        scrollwheel: false
      });
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
    }
  });
}

/**
 * Get current restaurant from page URL.
 */
fetchRestaurantFromURL = (callback) => {
  if (self.restaurant) { // restaurant already fetched!
    callback(null, self.restaurant)
    return;
  }
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    error = 'No restaurant id in URL'
    callback(error, null);
  } else {
    DBHelper.fetchRestaurantById(id, (error, restaurant) => {
      self.restaurant = restaurant;
      if (!restaurant) {
        console.error(error);
        return;
      }
      fillRestaurantHTML();
      callback(null, restaurant)
    });
  }
}

/**
 * Create restaurant HTML and add it to the webpage
 */
fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  const image = document.getElementById('restaurant-img');
  image.className = 'restaurant-img'
  image.src = DBHelper.imageUrlForRestaurant(restaurant);
  image.srcset = DBHelper.imageSrcsetUrlsForRestaurant(restaurant);
  image.sizes = DBHelper.imageSizes();
  image.alt = DBHelper.imageAltForRestaurant(restaurant);

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
  // fill reviews
  fillReviewsHTML();
}

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);
  }
}

/**
 * Create all reviews HTML and add them to the webpage.
 */
// fillReviewsHTML = (reviews = self.restaurant.reviews) => {
fillReviewsHTML = () => {
  let reviews;
  DBHelper.fetchRewiewsForRestaurant((error, reviewsForRestaurant) => {
    reviews = reviewsForRestaurant;
    const container = document.getElementById('reviews-container');
    const title = document.createElement('h2');
    title.innerHTML = 'Reviews';
    container.appendChild(title);
  
    if (!reviews) {
      const noReviews = document.createElement('p');
      noReviews.innerHTML = 'No reviews yet!';
      container.appendChild(noReviews);
      return;
    }
    const ul = document.getElementById('reviews-list');
    reviews.forEach(review => {
      ul.appendChild(createReviewHTML(review));
    });
    const reviewForm = createReviewFormHTML();
    ul.appendChild(reviewForm)
    container.appendChild(ul);
    addListenerToRatingStars();
  });

}

/**
 * Listen to rating stars input and act accordingly.
 */
addListenerToRatingStars = () => {
  const ratingInput = document.querySelector('#rating');
  const starsOuter = document.querySelector('.stars-outer');
  const starsInner = document.querySelector('.stars-inner');

  const totalWidthString = window.getComputedStyle(starsOuter).width;
  const totalWidth = parseFloat(totalWidthString.substr(0, totalWidthString.indexOf('px')));
  starsOuter.addEventListener('click', (e) => {
    const calculatedWidth = Math.round(e.offsetX * 10) / 10;
    starsInner.style.width = `${calculatedWidth}px`;
    ratingInput.value = widthToRating(calculatedWidth);
  });

  ratingInput.addEventListener('input', (e) => {
    const rating = e.target.value;
    starsInner.style.width = `${ratingToWidth(rating)}px`;
  })

  const widthToRating = (width) => {
    return Math.round((width/totalWidth)*5 * 10) / 10;
  }

  const ratingToWidth = (rating) => {
    return Math.round((rating/5)*totalWidth * 10) / 10;
  }
}

/**
 * Create review HTML and add it to the webpage.
 */
createReviewHTML = (review) => {
  const li = document.createElement('li');
  const name = document.createElement('p');
  name.innerHTML = review.name;
  li.appendChild(name);

  const date = document.createElement('p');
  // date.innerHTML = review.date;
  date.innerHTML = (new Date(review.updatedAt)).toDateString();
  li.appendChild(date);

  const rating = document.createElement('p');
  rating.innerHTML = `Rating: ${review.rating}`;
  li.appendChild(rating);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  li.appendChild(comments);

  return li;
}

/**
 * Create review form HTML and add it to the webpage.
 */
createReviewFormHTML = () => {
  const li = document.createElement('li');
  const form = document.querySelector('template#form-template').content.querySelector('#review-form');
  
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    console.log(e);
    const ratingInput = form.querySelector('#rating');
    const commentTextarea = form.querySelector('#comment');
    const formLi = form.parentElement;

    const ul = document.getElementById('reviews-list');

    const review = {
      id: parseInt(ul.childNodes.length) + 1,
      restaurant_id: self.restaurant.id,
      name: self.restaurant.name,
      rating: parseFloat(ratingInput.value),
      createdAt: Number(new Date),
      updatedAt: Number(new Date),
      comments: commentTextarea.value
    };

    ul.insertBefore(createReviewHTML(review), formLi);
    console.log('review object = ', review);

    fetch('http://localhost:1337/reviews/', {
      method: 'POST',
      body: JSON.stringify(review),
      headers: {
        'content-type': 'application/json'
      }
    })
    .then(response => console.log(response.json()))
    .catch(e => console.log(e));
  });
  li.appendChild(form);
  return li;
}

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
fillBreadcrumb = (restaurant=self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  li.innerHTML = restaurant.name;
  breadcrumb.appendChild(li);
}

/**
 * Get a parameter by name from page URL.
 */
getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}
