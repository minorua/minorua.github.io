const assets = [
	'./',

	'../timeline.png',

	'../timeline.css',

	'../jquery.js',
	'../localStorageList.js',
	'../timeline.js'
];

const cacheName = 'timeline202102';

self.addEventListener('install', (event) => {

	event.waitUntil(
		caches.open(cacheName).then((cache) => {
			return cache.addAll(assets);
		})
	);
});

self.addEventListener('activate', (event) => {

});

self.addEventListener('fetch', (event) => {

	event.respondWith(caches.match(event.request).then((cacheResponse) => {

		return cacheResponse || fetch(event.request);
	}));
});
