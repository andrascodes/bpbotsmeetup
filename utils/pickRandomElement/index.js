'use strict';

module.exports = function pickRandomElement(array) {
    return array[Math.floor(Math.random()*array.length)];
}