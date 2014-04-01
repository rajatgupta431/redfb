/**
 * Module dependencies.
 */
var express = require('express');
var routes = require('./routes');
var user = require('./routes/user');
var mongo = require('./routes/mongo');
var http = require('http');
var path = require('path');
var fs = require('fs');
var passport = require('passport'),
    util = require('util'),
    FacebookStrategy = require('passport-facebook').Strategy;
reddit = require('redwrap');


var app = express();

//request
var request = require('request');




var FACEBOOK_APP_ID = "286672721491401";
var FACEBOOK_APP_SECRET = '451dcb3e4676d1833d746ec0f76a76f3';



passport.serializeUser(function (user, done) {
    done(null, user);
});

passport.deserializeUser(function (obj, done) {
    done(null, obj);
});



passport.use(new FacebookStrategy({
        clientID: FACEBOOK_APP_ID,
        clientSecret: FACEBOOK_APP_SECRET,
        callbackURL: "http://11kx.t.proxylocal.com/auth/facebook/callback"
    },
    function (accessToken, refreshToken, profile, done) {

        // asynchronous verification, for effect...
        process.nextTick(function () {
            profile.token = accessToken;


            var new_entry = new mongo.user({
                token: accessToken,
                name: profile.name.givenName + ' ' + profile.name.familyName,

                id: profile.id,
                date: {
                    type: Date,
                    default: Date.now
                }

            });

            new_entry.save(function (err) {
                if (!err) {
                    console.log("User Details Saved");
                } else {
                    console.log(err);
                }
            });

            return done(null, profile);
        });
    }
));




//configure Express
app.configure(function () {
    app.set('views', __dirname + '/views');
    app.set('view engine', 'ejs');
    app.use(express.logger());
    app.use(express.cookieParser());
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(express.session({
        secret: 'keyboard cat'
    }));
    // Initialize Passport!  Also use passport.session() middleware, to support
    // persistent login sessions (recommended).
    app.use(passport.initialize());
    app.use(passport.session());
    app.use(app.router);
    app.use(express.static(__dirname + '/public'));
});

// development only
if ('development' == app.get('env')) {
    app.use(express.errorHandler());
}

app.get('/', function (req, res) {
    if (req.user != null) {
        mongo.page.find({
            id: req.user.id
        }, function (err, hits) {
            if (hits) {
                console.log(hits);
                res.render('index', {
                    user: req.user,
                    hits: hits
                });
            } else
                res.render('index', {
                    user: req.user,
                    hits: null
                });

        });
    } else res.render('index', {
        user: req.user,
        hits: null
    });


});

app.get('/login', function (req, res) {
    res.render('login', {
        user: req.user
    });
});
app.get('/auth/facebook',
    passport.authenticate('facebook', {
        scope: ['read_stream', 'user_groups', 'manage_pages', 'publish_actions']
    })
);
app.get('/auth/facebook/callback',
    passport.authenticate('facebook', {
        failureRedirect: '/login'
    }),
    function (req, res) {
        setTimeout(function () {
            res.redirect('/');
        }, 2000);
    });
app.get('/logout', function (req, res) {
    req.logout();
    res.redirect('/');
});
app.post('/subreddit', function (req, response) {
    console.log(req.body.subreddit);
    reddit.r(req.body.subreddit).top().exe(function (err, data, res) {
        if (err) {
            response.send(err);
            return;
        } else if (data.error) {
            response.send(data.error);
            return;
        } else {
            console.log(data.data.children); //outputs object representing first page of  subreddit
            response.render('subreddits', {
                subreddits: data.data.children
            });
        }
    });


});
app.post('/reddit', function (req, res) {
    console.log(req.body.title + "And URL is " + req.body.url);

    req.session.title = req.body.title;
    req.session.url = req.body.url;

    request({
            uri: "https://graph.facebook.com/me/accounts/?access_token=" + req.user.token,

            timeout: 15000,
            method: "GET"
        },

        function (err, response, body) {
            if (!err) {
                console.log(body);
                body = JSON.parse(body);
                //req.session.page_token= body.data[0].access_token;

                res.render('accounts', {
                    data: body.data
                });


            } else console.log(err);




        });

});

app.post('/fb', function (req, res) {
    var new_entry = new mongo.page({
        name: req.body.page_name,
        id: req.user.id,
        title: req.session.title,
        url: req.session.url,
        page_name: req.body.name,
        date: {
            type: Date,
            default: Date.now
        }
    });

    new_entry.save(function (err) {
        if (!err) {
            console.log("new post to the page");
        } else {
            console.log(err);
        }
    });


    req.session.page_token = req.body.access_token;
    if (req.session.url.indexOf('imgur.com') != -1) {
        console.log("FOUND IMGUR");
        request({
                uri: "https://graph.facebook.com/me/photos/?access_token=" + req.session.page_token + "&message=" + req.session.title + "&url=" + req.session.url,

                timeout: 15000,
                method: "POST"
            },

            function (err, response, body) {
                if (!err) {
                    console.log(body);
                    res.send(body);
                } else console.log(err);

            });




    } else {
        request({
                uri: "https://graph.facebook.com/me/feed/?access_token=" + req.session.page_token + "&message=" + req.session.title + "" + req.session.url,

                timeout: 15000,
                method: "POST"
            },

            function (err, response, body) {
                if (!err) {
                    console.log(body);
                    res.send(body);
                } else console.log(err);

            });



    }

});

app.get('/stats', function (req, res) {

    mongo.page.find({
        page_name: req.query.name
    }, function (err, body) {

        if (!err) res.render('stats', {
            stats: body
        });
        else res.send(err);


    });


});




app.listen(process.env.PORT || 3000);
