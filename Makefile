dist:
	mkdir -p dist
	browserify js/index.js --standalone tideline > dist/tideline.js
	lessc css/tideline.less dist/tideline.css

example:
	browserify --debug example/example.js > example/bundle.js
	lessc example/example.less example/example.css

responsive:
	browserify --debug example/example.js > example/bundle.js
	lessc example/responsive.less example/example.css

test:
	./node_modules/.bin/mocha test/*util.js --reporter spec

minimal-test:
	./node_modules/.bin/mocha test/*util.js --reporter nyan

server:
	python dev/simple_server.py

develop: minimal-test example server

resp: minimal-test responsive server

.PHONY: dist example test minimal-test server run