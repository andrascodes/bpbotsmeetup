'use strict';

const engines = require('consolidate');

module.exports = function Routes(app) {

    app.engine('html', engines.nunjucks);
    app.set('view engine', 'html');
    app.set('views', `${__dirname}/views`);

    app.get('/privacy', function(req, res, next) {
        res.render('privacy');
    });

    app.get('/tos', function(req, res, next) {
        res.render('tos');
    });

    
}