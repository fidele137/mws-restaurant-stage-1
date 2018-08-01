let restaurant;
let allReviews;
var map;

document.addEventListener('DOMContentLoaded', event => {
	registerServiceWorker();
});

/**
 * Register ServiceWorker at page load
 */
registerServiceWorker = () => {
	if (!navigator.serviceWorker) return;

	navigator.serviceWorker
		.register('/service-worker.js')
		.then(reg => {
			console.log('ServiceWorker successfully registered !');
			if (!navigator.serviceWorker.controller) return;

			if (reg.waiting) {
				console.log('Service worker WAITING..., [updateReady]');
			}

			if (reg.installing) {
				console.log('Service worker INSTALLING..., [trackInstalling]');
			}

			reg.addEventListener('updatefound', () => {
				console.log('Service worker Update Found, [trackInstalling]');
			});
		})
		.catch(e => {
			console.error('Error registering the service worker', e);
		});
};

/**
 * create map HTML markup.
 */
createMapHTML = () => {
	const map = document.createElement('div');
	map.id = 'map';
	map.role = 'application';
	map.ariaLabel = 'Google Maps with restaurant location';
	return map;
};

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
	const mapButton = document.querySelector('.map-button');
	mapButton.addEventListener('click', () => {
		self.map = new google.maps.Map(document.getElementById('map'), {
			zoom: 16,
			center: self.restaurant.latlng,
			scrollwheel: false
		});
		DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
	});

	fetchRestaurantFromURL((error, restaurant) => {
		if (error) {
			console.error(error);
		} else {
			fillBreadcrumb();
		}
	});
};

/**
 * Get current restaurant from page URL.
 */
fetchRestaurantFromURL = callback => {
	if (self.restaurant) {
		// restaurant already fetched!
		callback(null, self.restaurant);
		return;
	}
	const id = getParameterByName('id');
	if (!id) {
		// no id found in URL
		error = 'No restaurant id in URL';
		callback(error, null);
	} else {
		DBHelper.fetchRestaurantById(id, (error, restaurant) => {
			self.restaurant = restaurant;
			if (!restaurant) {
				console.error(error);
				return;
			}
			fillRestaurantHTML();
			callback(null, restaurant);
		});
	}
};

/**
 * Create restaurant HTML and add it to the webpage
 */
fillRestaurantHTML = (restaurant = self.restaurant) => {
	const nameAndFavorite = document.querySelector('.name-and-favorite');

	const name = document.getElementById('restaurant-name');
	name.innerHTML = restaurant.name;

	const favoriteToggle = nameAndFavorite.querySelector('button');
	if (restaurant.is_favorite) {
		favoriteToggle.classList.add('favorite-toogle');
	}

	favoriteToggle.addEventListener('click', () => {
		const restaurantId = restaurant.id;
		favoriteToggle.classList.toggle('favorite-toogle');
		let isFavorite = favoriteToggle.classList.contains('favorite-toogle') ? true : false;

		restaurant.is_favorite = isFavorite;
		restaurant.updatedAt = Number(new Date());
		const restaurantUpdated = {
			id: restaurant.id,
			is_favorite: restaurant.is_favorite,
			updatedAt: restaurant.updatedAt
		};

		function changeFavoriteStatus() {
			return fetch(`http://localhost:1337/restaurants/${restaurantId}/?`, {
				method: 'PUT',
				body: JSON.stringify(restaurantUpdated),
				headers: {
					'content-type': 'application/json'
				}
			})
				.then(response => {
					console.log('success', response);
					if (navigator.onLine) {
						window.removeEventListener('online', changeFavoriteStatus);
					}
				})
				.catch(err => {
					console.log('failure', err);
					window.addEventListener('online', changeFavoriteStatus);
				});
		}

		// Put restaurant as favorite
		// IndexedDB first
		DBHelper.changeRestaurantFavoriteStatus(restaurantUpdated);
		// Network
		changeFavoriteStatus();
	});

	const address = document.getElementById('restaurant-address');
	address.innerHTML = restaurant.address;

	const image = document.getElementById('restaurant-img');
	image.className = 'restaurant-img';
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
};

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
};

/**
 * Create all reviews HTML and add them to the webpage.
 */
// fillReviewsHTML = (reviews = self.restaurant.reviews) => {
fillReviewsHTML = () => {
	let reviews;
	DBHelper.fetchRewiewsForRestaurant((error, reviewsForRestaurant) => {
		if (error) {
			console.log('error fetching reviews for restaurant');
		} else {
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
			// review form
			const reviewForm = createReviewFormHTML();
			ul.appendChild(reviewForm);
			container.appendChild(ul);

			container.addEventListener('click', e => {
				const target = e.target;
				const menus = [...document.querySelectorAll('.name-and-menu input')];
				menus.forEach(menu => {
					if (menu != target && menu.checked) {
						// hide popup when clicking outside the popup
						menu.checked = false;
					}
				});
			});
		}
	});

	DBHelper.fetchReviews((error, reviews) => {
		if (error) {
			console.log(error);
		} else {
			self.allReviews = reviews;
		}
	});
};

/**
 * Listen to rating stars input and act accordingly.
 */
addListenerToRatingStars = form => {
	const ratingInput = form.querySelector('#rating');
	const starsOuter = form.querySelector('.stars-outer');
	const starsInner = form.querySelector('.stars-inner');

	let totalWidth;
	requestAnimationFrame(() => {
		const totalWidthString = window.getComputedStyle(starsOuter).width;
		totalWidth = parseFloat(totalWidthString.substr(0, totalWidthString.indexOf('px')));
	});

	starsOuter.addEventListener('click', e => {
		const calculatedWidth = (Math.round((e.offsetX / totalWidth) * 5) / 5) * totalWidth;
		ratingInput.value = widthToRating(calculatedWidth);
		requestAnimationFrame(() => (starsInner.style.width = `${calculatedWidth}px`));
	});

	ratingInput.addEventListener('input', e => {
		const rating = e.target.value;
		requestAnimationFrame(() => (starsInner.style.width = `${ratingToWidth(rating)}px`));
	});

	function widthToRating(width) {
		return Math.round((width / totalWidth) * 5 * 2) / 2;
	}

	function ratingToWidth(rating) {
		return Math.round((rating / 5) * totalWidth * 2) / 2;
	}

	if (ratingInput.value != null) {
		requestAnimationFrame(
			() => (starsInner.style.width = `${ratingToWidth(parseFloat(ratingInput.value))}px`)
		);
	}
};

/**
 * Create review HTML and add it to the webpage.
 */
createReviewHTML = review => {
	const ul = document.querySelector('#reviews-list');

	const li = document.createElement('li');
	const uid = generateUUID();
	li.id = `li-${uid}`;

	// header of review container
	const nameAndMenuContainer = document.createElement('div');
	nameAndMenuContainer.classList.add('name-and-menu');

	const name = document.createElement('p');
	name.innerHTML = review.name;
	nameAndMenuContainer.appendChild(name);

	/* Start menu */
	// popup for modifying or deleting review
	const menu = document.createElement('div');
	const checkboxInput = document.createElement('input');
	checkboxInput.type = 'checkbox';
	const checkoxId = `checkbox-${uid}`;
	checkboxInput.id = checkoxId;
	menu.appendChild(checkboxInput);

	const checkboxLabel = document.createElement('label');
	checkboxLabel.innerHTML = '⋮';
	checkboxLabel.htmlFor = checkoxId;
	menu.appendChild(checkboxLabel);

	const modifyAndDeleteContainer = document.createElement('div');
	modifyAndDeleteContainer.classList.add('menu-options');

	// modify review
	const modifyButton = document.createElement('button');
	modifyButton.innerHTML = 'Modify';
	modifyButton.addEventListener('click', e => {
		e.stopPropagation();
		const li = document.querySelector(`#li-${uid}`);
		const newLi = modifyFormHTML(review);
		console.log('modify', 'li = ', li, 'newLi = ', newLi);
		ul.replaceChild(newLi, li);
	});
	modifyAndDeleteContainer.appendChild(modifyButton);

	// delete review
	const deleteButton = document.createElement('button');
	deleteButton.innerHTML = 'Delete';
	deleteButton.addEventListener('click', e => {
		e.stopPropagation();
		const li = document.querySelector(`#li-${uid}`);
		ul.removeChild(li);
		deleteReviewHTML(review);
		console.log('delete', li);
	});
	modifyAndDeleteContainer.appendChild(deleteButton);
	menu.appendChild(modifyAndDeleteContainer);
	/* End menu */

	nameAndMenuContainer.appendChild(menu);
	li.appendChild(nameAndMenuContainer);

	const date = document.createElement('p');
	date.innerHTML = new Date(review.updatedAt).toDateString();
	li.appendChild(date);

	const rating = document.createElement('p');
	rating.innerHTML = `Rating: ${review.rating}`;
	li.appendChild(rating);

	const comments = document.createElement('p');
	comments.innerHTML = review.comments;
	li.appendChild(comments);

	return li;
};

/**
 * Util method to generate a unique uuid
 * From: https://www.w3resource.com/javascript-exercises/javascript-math-exercise-23.php
 */
function generateUUID() {
	let d = new Date().getTime();
	let uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
		let r = (d + Math.random() * 16) % 16 | 0;
		d = Math.floor(d / 16);
		return (c == 'x' ? r : (r & 0x3) | 0x8).toString(16);
	});
	return uuid;
}

/**
 * Create review form HTML and add it to the webpage.
 */
createReviewFormHTML = () => {
	const li = document.createElement('li');
	const form = document
		.querySelector('template#form-template')
		.content.cloneNode(true)
		.querySelector('#review-form');

	form.addEventListener('submit', formAddSumbitCallback);
	addListenerToRatingStars(form);
	li.appendChild(form);
	return li;
};

/**
 * Form Add submit callback
 */
const formAddSumbitCallback = function(e) {
	e.preventDefault();
	console.log('this = ', this);
	const nameInput = this.querySelector('#name');
	const ratingInput = this.querySelector('#rating');
	const commentTextarea = this.querySelector('#comment');
	const formLi = this.parentElement;

	const ul = document.querySelector('#reviews-list');

	const newReview = {
		id: self.allReviews.length + 1,
		restaurant_id: self.restaurant.id,
		name: nameInput.value,
		rating: parseFloat(ratingInput.value),
		comments: commentTextarea.value,
		createdAt: Number(new Date()),
		updatedAt: Number(new Date())
	};
	self.allReviews.push(newReview);
	console.log('newReview = ', newReview);

	ul.insertBefore(createReviewHTML(newReview), formLi);

	function addReview() {
		return fetch('http://localhost:1337/reviews/', {
			method: 'POST',
			body: JSON.stringify(newReview),
			headers: {
				'content-type': 'application/json'
			}
		})
			.then(response => {
				console.log('success', response);
				if (navigator.onLine) {
					window.removeEventListener('online', addReview);
				}
			})
			.catch(err => {
				console.log('failure', err);
				window.addEventListener('online', addReview);
			});
	}

	// IndexedDB first
	DBHelper.addReview(newReview);
	// Network
	addReview();

	const resetInputValues = () => {
		nameInput.value = null;
		ratingInput.value = null;
		commentTextarea.value = null;
		const starsInner = this.querySelector('.stars-inner');
		requestAnimationFrame(() => (starsInner.style.width = `0`));
	};
	resetInputValues();
};

/**
 * Modify form template.
 */
modifyFormHTML = review => {
	const li = document.createElement('li');
	const formLi = createReviewFormHTML();
	const form = formLi.querySelector('form');

	const nameInput = form.querySelector('#name');
	nameInput.value = review.name;
	const ratingInput = form.querySelector('#rating');
	ratingInput.value = review.rating;

	const commentTextarea = form.querySelector('#comment');
	commentTextarea.value = review.comments;

	form.removeEventListener('submit', formAddSumbitCallback);

	form.addEventListener('submit', function(e) {
		formModifyCallback(e, review);
	});
	li.appendChild(form);
	return li;
};

/**
 * Form Modify submit callback
 */
const formModifyCallback = function(e, review) {
	e.preventDefault();
	const form = e.target;
	const li = form.parentElement;
	const nameInput = form.querySelector('#name');
	const ratingInput = form.querySelector('#rating');
	const commentTextarea = form.querySelector('#comment');

	const ul = document.querySelector('#reviews-list');
	console.log('REVIEW = ', review);

	const updatedReview = {
		id: review.id,
		restaurant_id: review.restaurant_id,
		name: nameInput.value,
		rating: parseFloat(ratingInput.value),
		comments: commentTextarea.value,
		updatedAt: Number(new Date())
	};
	const newLi = createReviewHTML(updatedReview);
	console.log('newLi = ', newLi);
	ul.replaceChild(newLi, li);

	function modifyReview() {
		return fetch(`http://localhost:1337/reviews/${review.id}`, {
			method: 'PUT',
			body: JSON.stringify(updatedReview),
			headers: {
				'content-type': 'application/json'
			}
		})
			.then(response => {
				console.log('success', response);
				if (navigator.onLine) {
					window.removeEventListener('online', modifyReview);
				}
			})
			.catch(err => {
				console.log('failure', err);
				window.addEventListener('online', modifyReview);
			});
	}

	// IndexedDB before
	DBHelper.modifyReview(updatedReview);
	// Network
	modifyReview();
};

/**
 * Delete review template.
 */
deleteReviewHTML = review => {
	function deleteReview() {
		return fetch(`http://localhost:1337/reviews/${review.id}`, {
			method: 'DELETE'
		})
			.then(response => {
				console.log('success', response);
				if (navigator.onLine) {
					window.removeEventListener('online', deleteReview);
				}
			})
			.catch(err => {
				console.log('failure', err);
				window.addEventListener('online', deleteReview);
			});
	}

	// IndexedDB before
	DBHelper.deleteReview(review);
	// Network
	deleteReview();
};

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
fillBreadcrumb = (restaurant = self.restaurant) => {
	const breadcrumb = document.getElementById('breadcrumb');
	const li = document.createElement('li');
	li.innerHTML = restaurant.name;
	breadcrumb.appendChild(li);
};

/**
 * Get a parameter by name from page URL.
 */
getParameterByName = (name, url) => {
	if (!url) url = window.location.href;
	name = name.replace(/[\[\]]/g, '\\$&');
	const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
		results = regex.exec(url);
	if (!results) return null;
	if (!results[2]) return '';
	return decodeURIComponent(results[2].replace(/\+/g, ' '));
};
