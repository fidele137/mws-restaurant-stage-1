/**
 * Common database helper functions.
 */
class DBHelper {

  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static get DATABASE_URL() {
    const port = 1337 // Change this to your server port
    return `http://localhost:${port}/restaurants`;
  }

  /**
   * Idb database name.
   */
  static get REVIEWS_URL() {
    const port = 1337 // Change this to your server port
    return `http://localhost:${port}/reviews`;
  }

  /**
   * Idb database name.
   */
  static get IDB_DATABASE_NAME() {
    return `mws-restaurant-idb`;
  }

  /**
   * Idb database version.
   */
  static get IDB_VERSION() {
    return 2;
  }

  /**
   * Idb restaurants store name.
   */
  static get IDB_RESTAURANT_STORE_NAME() {
    return 'restaurants';
  }

  /**
   * Idb reviews store name.
   */
  static get IDB_REVIEW_STORE_NAME() {
    return 'reviews';
  }

  /**
   * Open IndexedDB database
   */
  static openIndexedDB(callback) {
    // Using vanilla IndexedDB here instead of idb
    // Understanding how it is used compared with idb-with-promises

    if (!navigator.serviceWorker || !window.indexedDB) {
      return console.log('IndexedDB is not supported in your current browser');
    };

    var db;
    var idbRequest = window.indexedDB.open(DBHelper.IDB_DATABASE_NAME, DBHelper.IDB_VERSION);

    idbRequest.onerror = (event) => {
      console.log('An error occured when trying to open indexedDB', event.target.errorCode);
    };

    idbRequest.onsuccess = (event) => {
      db = event.target.result;
      callback(db);
    };

    idbRequest.onupgradeneeded = (event) => {
      var restaurantStore = event.currentTarget.result.createObjectStore(
        DBHelper.IDB_RESTAURANT_STORE_NAME, { keyPath: 'id' }
      );

      var reviewStore = event.currentTarget.result.createObjectStore(
        DBHelper.IDB_REVIEW_STORE_NAME, { keyPath: 'id' }
      );
    };
  }

  /**
   * Fetch all restaurants.
   */
  static fetchRestaurants(callback) {
    let idbRestaurants = [];

    return DBHelper.openIndexedDB((db) => {
      var tx = db.transaction('restaurants');
      var restaurantStore = tx.objectStore('restaurants');
      var request = restaurantStore.getAll();

      request.onsuccess = (event) => {
        idbRestaurants = event.target.result;

        if (idbRestaurants.length !== 0) {
          return callback(null, idbRestaurants);
        } else {
          return DBHelper.fetchRestaurantsFromNetwork((error, restaurants) => {
            if (error) {
              callback(error, null);
            } else {
              callback(null, restaurants);
            }
          });
        }
      };
    });
  }

  /**
   * Fetch all restaurants but only from the network.
   */
  static fetchRestaurantsFromNetwork(callback) {
    fetch(DBHelper.DATABASE_URL)
      .then((response) => {
        return response.json();
      })
      .then((restaurants) => {
        callback(null, restaurants);

        DBHelper.openIndexedDB((db) => {
          var tx = db.transaction('restaurants', 'readwrite');
          var restaurantStore = tx.objectStore('restaurants');
          restaurants.forEach((restaurant) => {
            restaurantStore.put(restaurant);
          });
        });
      })
      .catch(error => callback(error, null));
  }

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id, callback) {
    // fetch all restaurants with proper error handling.
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        const restaurant = restaurants.find(r => r.id == id);
        if (restaurant) { // Got the restaurant
          callback(null, restaurant);
        } else { // Restaurant does not exist in the database
          callback('Restaurant does not exist', null);
        }
      }
    });
  }

  /**
   * Change restaurant favorite status (is_favorite = true or false)
   */
  static changeRestaurantFavoriteStatus(restaurant) {
    DBHelper.openIndexedDB((db) => {
      var tx = db.transaction('restaurants', 'readwrite');
      var restaurantStore = tx.objectStore('restaurants');
      restaurantStore.put(restaurant);
    });
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants;
        if (cuisine != 'all') { // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') { // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        callback(null, results);
      }
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood);
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i);
        callback(null, uniqueNeighborhoods);
      }
    });
  }

  
  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type);
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i);
        callback(null, uniqueCuisines);
      }
    });
  }

    /**
   * Fetch all with proper error handling.
   */
  static fetchReviews(callback) {
    let idbReviews = [];
    DBHelper.openIndexedDB((db) => {
      var tx = db.transaction('reviews', 'readwrite');
      var reviewStore = tx.objectStore('reviews');
      var request = reviewStore.getAll();
      request.onsuccess = (event) => {
        idbReviews = event.target.result;
        if (idbReviews.length !== 0) {
          callback(null, idbReviews);
        } else {
          return DBHelper.fetchReviewsFromNetwork((error, reviews) => {
            if (error) {
              callback(error, null);
            } else {
              callback(null, reviews);
            }
          });
        }
      }
    });
  }

  /**
   * Fetch all from network with proper error handling.
   */
  static fetchReviewsFromNetwork(callback) {
    // Trying to fetch all reviews with *REVIEWS_URL* doesn't work (bug with the server)
    // So we will get reviews from each restaurants and concatenate the results

    /* fetch(DBHelper.REVIEWS_URL)
      .then((response) => {
        return response.json();
      })
      .then((reviews) => {
        callback(null, reviews);
        DBHelper.openIndexedDB((db) => {
          var tx = db.transaction('reviews', 'readwrite');
          var reviewStore = tx.objectStore('reviews');
          reviews.forEach(review => {
            reviewStore.put(review);
          });
        });
      })
      .catch(error => callback(error, null)); */

      let allReviews = [];
      DBHelper.fetchRestaurants(async (error, restaurants) => {
        try {
          for (let restaurant of restaurants) {
            const reviewsForRestaurant = await DBHelper.fetchRewiewsForRestaurantFromNetwork(restaurant);
            allReviews = [...allReviews, ...reviewsForRestaurant];
          }
          callback(null, allReviews);
          DBHelper.openIndexedDB((db) => {
            var tx = db.transaction('reviews', 'readwrite');
            var reviewStore = tx.objectStore('reviews');
            allReviews.forEach(review => {
              reviewStore.put(review);
            });
          });
        } catch(error) {
          callback(error, null);
        }
      });
  }

  /**
   * Fetch all reviews for a restaurant with proper error handling.
   */
  static fetchRewiewsForRestaurant(callback) {
    // Fetch reviews by restaurant id
    DBHelper.fetchReviews((error, reviews) => {
      if (error) {
        callback(error, null);
      } else {
        const reviewsForRestaurant = reviews.filter(review => review.restaurant_id === self.restaurant.id);
        callback(null, reviewsForRestaurant);
      }
    });
  }

  /**
   * Fetch all reviews for a restaurant from Network with proper error handling.
   */
  static async fetchRewiewsForRestaurantFromNetwork(restaurant) {
    let reviewsForRestaurant = await fetch(`${DBHelper.REVIEWS_URL}/?restaurant_id=${restaurant.id}`);
    return reviewsForRestaurant.json();
  }

  /**
   * Add a review to a restaurant
   */
  static addReview(review) {
    DBHelper.openIndexedDB((db) => {
      var tx = db.transaction('reviews', 'readwrite');
      var reviewStore = tx.objectStore('reviews');
      reviewStore.add(review);
    });
  }

  /**
   * Modify a restaurant's review
   */
  static modifyReview(review) {
    review.updatedAt = Number(new Date());
    DBHelper.openIndexedDB((db) => {
      var tx = db.transaction('reviews', 'readwrite');
      var reviewStore = tx.objectStore('reviews');
      reviewStore.put(review);
    });
  }

  /**
   * Delete a restaurant's review
   */
  static deleteReview(review) {
    DBHelper.openIndexedDB((db) => {
      var tx = db.transaction('reviews', 'readwrite');
      var reviewStore = tx.objectStore('reviews');
      reviewStore.delete(review.id);
    });
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return `./restaurant.html?id=${restaurant.id}`;
  }

  /**
   * Restaurant image utils.
   */
  static imageUrlPlaceholder() {
    return `/img/1_small.webp`;
  }

  static imageUrlForRestaurant(restaurant) {
    let imgName;
    // The photograph property of restaurant *10* is missing from the server restaurants data
    if (!restaurant.photograph) {
      imgName = '10';
    } else {
      imgName = restaurant.photograph.split('.')[0];
    }
    return `/img/${imgName}_small.webp`;
  }

  static imageSrcsetUrlsForRestaurant(restaurant) {
    let imgName;
    // Same as method above
    if (!restaurant.photograph) {
      imgName = '10';
    } else {
      imgName = restaurant.photograph.split('.')[0];
    }
    return `/img/${imgName}_small.webp 400w, /img/${imgName}_medium.webp 600w, /img/${imgName}_large.webp 800w`;
  }

  static imageSizes() {
    return `(min-width: 769px) 50%, 100%`;
  }

  static imageAltForRestaurant(restaurant) {
    return `Restaurant ${restaurant.name}`;
  }

  /**
   * Map marker for a restaurant.
   */
  static mapMarkerForRestaurant(restaurant, map) {
    const marker = new google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant),
      map: map,
      animation: google.maps.Animation.DROP}
    );
    return marker;
  }

}
