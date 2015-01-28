var Util = require( 'findhit-util' ),
    Error = require( './error' ),
    Route = require( './route' ),
    Promise = require( 'bluebird' ),
    Stack = require( 'stack-queue' ),

    debug = require( 'debug' )( 'emvici-router:router' );

// -----------------------------------------------------------------------------

/**
 * @class Router
 * @param {Object} options Default options to be passed inside *emvici*
 * @example
 * ```
 * new Router({
 * 	reqSessionKey  : "emviciSessionKey"
 * });
 * ```
 *
 */
function Router ( options ) {

    /**
     * @property options
     * @extends Router.defaultOptions
     * @type {Object}
     */
    this.options = Util.is.Object( options ) && options || {};
    this.options.__proto__ = Router.defaultOptions;

    // Init routes array, this will save all router configuration
    this.Routes = [];

    /**
     * @property paramsStacks
     * Instantiates an Associative Array used to keep track of the param associated to a Stack of functions to be executed.
     * @type {Object} Used to save the Stacks to be executed.
     */
    this.paramsStacks = {};

};

// Export Router
module.exports = Router;

/**
 * defaultOptions Default Options Object
 * @type {Object}
 */
Router.defaultOptions = {
    /**
     * @property reqSessionKey
     * @default 'session'
     * @type {String}
     */
    reqSessionKey: 'session',

    /**
     * @property throw404
     * @default true
     * @type {Boolean}
     */
    throw404: true,
};

/**
 * @method handle Handles the current Request that will be used on this middleware.
 * @param  {Request}    req   HTTP Request Object
 * @param  {Response}   res   HTTP Response Object
 * @param  {Function}   outcb Callback to handle Responses
 */
Router.prototype.handle = function emvici_router ( req, res, outcb ) {

    // TODO: change proto of req and res to our own protos
    debug( "dispatching %s", req.url );

    // Link things into req
    req.router = this;

    var i = -1, next,
        router = this,
        handled = 0, out;

    /**
     * @method out Internal Callback function used to check
     * @access internal
     * @param  {String|Error} StrOrErr Passes a String or an Error in case
     * @return {Mixed} The return value of the Callback function outcb
     */
    out = function ( StrOrErr ) {
        if( handled ) {
            throw new Error([
                "Middleware already handled!",
                "It seems that you've called `next` twice or more!",
                "This WILL result in Memory Leaks, please correct it!"
                ].join(" "));
        }

        debug( "nexting %s for %s", StrOrErr, req.url );

        handled++;
        return outcb( StrOrErr );
    };

    /**
     * Calls the next Item in the route
     * @param  {String|Error}   StrOrErr
     * @return {Function}
     */
    next = function ( StrOrErr ) {

        // If there is an error, we should get out of this middleware!
        // So a good error handle middleware can handle it !! :D
        if( StrOrErr !== 'route' ) {
            out( StrOrErr );
            return;
        }

        debug( "searching routes for %s", req.url );

        try {
            while ( i < router.Routes.length ) { i++;
                var ConstructedRoute = router.Routes[ i ];

                if( ! ConstructedRoute ) {
                    break;
                }

                // Try to match route
                var matchedPath = ConstructedRoute.match( req.url, req.method );

                if( ! matchedPath ) {
                    continue;
                }

                var route = new ConstructedRoute( router, next, matchedPath, req, res );

                debug( "found a route for %s", req.url );

                // If there aren't params, lets get it into the simpliest way!
                if( ! route.params ) {
                    route.dispatch().done(function ( err, str ) { next( err || ( typeof str == 'undefined' ? undefined : str || 'route' ) ); });
                    return;
                }

                // Hey honey
                // It seems that there are params, we must check, for each param,
                // if there is a stack available to run, mix them up and execute
                // them! Seems hard? F*cking no!

                var stacks = [];

                // Check for params stacks
                for( var x in route.params ) {
                    if( router.paramsStacks[ x ] ) {
                        stacks.push( router.paramsStacks[ x ] );
                    }
                }

                // If there aren't stacks, i will repeat the step on top.
                // Just because it will be fast and productive
                if( stacks.length === 0 ) {
                    route.dispatch().done(function ( err, str ) { next( err || ( typeof str == 'undefined' ? undefined : str || 'route' ) ); });
                    return;
                }

                // Giving super powers to stacks!! With promise powder!
                var promise = Promise.cast();

                Util.Array.each( stacks, function ( stack ) {
                    promise = promise.then(function ( str ) {
                        if( Util.is.String( str ) ) return str;
                        return stack.dispatch( req, res );
                    });
                });

                return promise
                    .then(function ( str ) {
                        if( Util.is.String( str ) ) return str;
                        return route.dispatch();
                    })
                    // Just dispatch data into next if rejected
                    // or if fulfilled has a string
                    // Otherwise, in case of fulfilled, it will get NotFound
                    .then(function ( str ) { next( ( typeof str == 'undefined' ? undefined : str || 'route' ) ); }, next );

                // THERE IT IS! I just need a cup of coffee...
                // returning to coffee shop...
            }
        } catch( err ) {
            return out( err );
        }

        // In case no Route was found
        out( router.options.throw404 ? new Error.NotFound( "No route was matched" ) : null );
    };

    next( 'route' );
};

Router.prototype.addRoute = function ( options ) {
    var ConstructedRoute = Route.construct( options );

    this.Routes.push( ConstructedRoute );

    return ConstructedRoute;
};

Router.prototype.addRoutes = function ( routesOptions ) {
    return Util.Array.map( routesOptions, this.addRoute, this );
};

var methodConstruction = function ( method, args ) {

    // If there isn't url, throw an error
    if ( Util.isnt.String( args[0] ) && Util.isnt.RegExp( args[0] ) ) {
        throw new TypeError( "first argument should be a String or Regexp" );
    }

    var options = {
        url: [ args[0] ],
        method: method,
        stack: [],
    };

    // We have to check arguments for functions
    for( var i = 1; i < args.length; i++ ) {
        if( typeof args[ i ] == 'function' ) {
            options.stack.push( args[ i ] );
        }
    }

    // If there aren't step functions, throw error
    if( options.stack.length === 0 ) {
        throw new TypeError( "It seems that you didn't provided any function" );
    }

    return this.addRoute( options );
};

// Inject function proxying
Util.Array.each( Route.METHODS, function ( method ) {

    /**
        http method will be always uppercase, so we need to lower case it to be
        presented as a good method name
    */
    var methodName = method.toLowerCase();


    Router.prototype[ methodName ] = function () {
        return methodConstruction.call( this, method, arguments );
    };

});

/**
 * @method param
 *         Makes it possible to retrieve params from a request.
 * @access public
 * @param  {String} param The param to check for.
 * @param  {Array} arguments First position reserved for the param property.
 *                           Remaining indexes available to pass Functions.
 *                           At least one function expected.
 * @return {Router} Returns itself to make chainable calls possible.
 *
 * @example Retrieve the name param of a request.
 * ```
 * .param( 'name', function ( req, res, next ) {
 * 		name = req.params.name;
 * 		....
 * ```
 *
 */
Router.prototype.param = function ( param ) {

    if( Util.isnt.String( param ) ) {
        throw new TypoError( "You must provide the param name as first argument" );
    }

    var fns = [];

    /**
     * @method dismantler
     * Takes an Array and iterates over it semi-recursively.
     * Checks for functions and appends them to an external fns Object.
     * @access private
     * @param {Array} fns
     * @param {Array}  object The array to iterate over.
     */
    var dismantler = function ( object ) {
        for( var i in object ) {

            // Check if object value is a function
            if( Util.is.Function( object[ i ] ) ) {
                fns.push( object[ i ] );
            } else

            // In case an array is provided,
            // try to dismantle it and search for functions
            if( Util.is.Array( object[ i ] ) ) {
                dismantler( object[ i ] );
            }
        }
    };

    dismantler( arguments );

    // Now, check if we gathered some functions
    if( fns.length === 0 ) {
        throw new TypeError( "You must provide at least an Array of Functions or Functions through arguments" );
    }

    // Check if there is a stack for the select argument
    if( ! this.paramsStacks[ param ] ) {
        // If not, create a new Stack
        this.paramsStacks[ param ] = new Stack();
    }

    // Queue functions
    this.paramsStacks[ param ].queue( fns );

    // Return router for chain proposes
    return this;
};
