'use strict';


const moment = require('moment');

console.log(moment(1473188400000).format('YYYYMMDD[T]HHmmss[Z]').toString());
console.log(new Date(1473188400000).toString());