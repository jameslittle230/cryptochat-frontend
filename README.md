# CryptoChat: Frontend

*See it live at <http://penguinegg.com>*

***

CryptoChat is a final project for AIT-Budapest's Cryptography course. 
The goal is to make an end-to-end encrypted chat service with a well-defined attacker model that uses a thoroughly-designed secure channel and message protocol that uses well-known encryption primitives.

## Development

To develop this, you'll need a computer with NodeJS, NPM, and some sort of web server installed.

Make sure to clone both this and the backend repository onto your hard drive somewhere. 
You'll need a web server serving the frontend content through HTTP and a NodeJS server as the HTTP endpoint, the socket connection, and the database interface.
Furthermore, you'll need a browserify (and watchify) instance to package all the frontend Javascript libraries into `build.js`.

### Setup:

Independently of downloading this repo:

~~~
$ sudo apt-get install nodejs
$ npm install -g browserify
$ npm install -g watchify
~~~

In this repo's directory:

~~~
$ npm install
~~~

To serve the page, I like to use Python's SimpleHTTPServer, which serves any directory to localhost. 
(Note that this command only works for Python 2).

~~~
$ python -m SimpleHTTPServer 8000
~~~

Finally, in a new terminal tab, start watchify to build the Javascript:

~~~
$ watchify app.js -o build.js
~~~

## Deployment

Deployment doesn't require any compilation, and you don't need to mess around with NPM. 
Download the repo and serve it from somewhere (probably using Apache, rather than Python's little server).

## Contribution

I mean, you can, if you want.
The assignment isn't final until the end of May, so I won't really look at anything until then.
