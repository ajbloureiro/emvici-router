var Util = require( 'findhit-util' ),

    debug = require( 'debug' )( 'emvici-router:route' );

// -----------------------------------------------------------------------------

/**
 * @class Route
 * @throws Error on instantiation
 * @ser #Route.construct
 */
function Route () {
    throw new Error([

        "You can't use Router directly to construct a new Route.",
        "Please use Route.construct method or [Type]Route.construct instead"

    ].join(" "));
}

// Export Route
module.exports = Route;

/**
 * Factory Route Constructor
 * @namespace emvici-router
 * @static
 * @method construct Static method that constructs a Route based on the passed options.
 *
 *	@param {Object} options
 *	@example
 *	var myRoute = Route.construct({
 *		url: ["/couves","/batatas"],
 *  	type: "wizard",
 *  	steps: [
 *  		{ // step
 *  			name: 'menu'
 *  		},
 *  		{ // step
 *  			name: 'drink'
 *  		}
 *  	]
 *	});
 */
Route.construct = function ( options ) {

    options = Util.is.Object( options ) && Util.extend( {}, options ) || {};
    options.__proto__ = Route.construct.defaultOptions;

    /**
     * This method will try to detect options for routes and then proxy
     * arguments into a specific route type's constructor.
     * If this can't gather a route type, it will default as 'stack'.
     */
    options.url =
        Util.is.Array( options.url ) && options.url ||
        (
            Util.is.String( options.url ) ||
            Util.is.RegExp( options.url )
        ) && [ options.url ] ||
        [];

    if( options.url.length === 0 ) {
        throw new TypeError( "It seems that options.url doesn't have urls..." );
    }

    var TypeRoute = Route.TYPES[
        options.type = (
            Util.is.String( options.type ) && options.type.toLowerCase() ) || 'stack'
    ];

    if( ! TypeRoute ) {
        throw new TypeError( "options.type provided doesn't exist!" );
    }

    // Before constructing a new Route, proto options by default Type
    options.__proto__ =
        TypeRoute.construct.defaultOptions || Route.construct.defaultOptions;

    /**
     * @inner ConstructedRoute
     * @class ConstructedRoute
     * @param {[type]} router      [description]
     * @param {[type]} nextRoute   [description]
     * @param {[type]} matchedPath [description]
     * @param {[type]} req         [description]
     * @param {[type]} res         [description]
     */
    function ConstructedRoute ( router, nextRoute, matchedPath, req, res ) {

        this.options = Object.create( ConstructedRoute.options );

        // Route
        this.router = router;

        // Current path filtering
        this.path = matchedPath;

        // Link things to route
        this.req = req;
        this.res = res;
        this.nextRoute = nextRoute;

        // Link route into things
        req.route = this;

        // Parse params from path
        this.params = req.params = matchedPath.Url2Params( req.url );

        // Force constructor to be this
        // Don't know why but constructor isn't being defined as ConstructedRoute
        this.constructor = ConstructedRoute;
    }

    // define methods
    ConstructedRoute.methods =
        Util.is.Array( options.methods ) && options.methods ||
        Util.is.String( options.methods ) && [ options.methods ] ||
        Util.is.String( options.method ) && [ options.method ] ||
        Route.METHODS;

    /**
     *
     * @type {Array<Path>}
     */
    ConstructedRoute.paths = [];
    ConstructedRoute.match = TypeRoute.match || Route.match;
    ConstructedRoute.options = options;

    ConstructedRoute.prototype = Object.create( TypeRoute.prototype );

    // Allow TypeRoute to manipulate ConstructedRoute
    TypeRoute.construct( ConstructedRoute );

    if( ConstructedRoute.paths.length === 0 ) {
        throw new TypeError(
            "It seems that there is not a valid path on this route"
        );
    }

    return ConstructedRoute;
};

/**
 * @static
 * @property defaultOptions
 * @type {Object}
 */
Route.construct.defaultOptions = {
    /**
     * @property type The Route type
     * @default 'stack'
     * @type {String}
     */
    type: 'stack',
    /**
     * @static
     * @property method
     * @type {String} The method name
     * @default undefined
     */
    method: undefined,
    /**
     * @static
     * @property prerequisites Stores the prerequisites needed to
     *                                execute this route
     * @type {Function}
     * @default undefined
     */
    prerequisites: undefined,
};

/**
 *
 * @static
 * @param  {String}     url    URL to match and
 * @param  {Function}   method [description]
 * @return {[type]}        [description]
 */
Route.match = function ( url, method ) {

    // Check if req.method is a valid one
    if( this.methods.indexOf( method ) === -1 ) {
        return false;
    }

    // Now, since we only need a path to match this route
    // Return the first valid path we found
    for( var i in this.paths ) {
        if( this.paths[ i ].match( url ) ) {
            return this.paths[ i ];
        }
    }

    // Otherwise, sorry...
    return false;
};

/* constants */

/**
 * @static
 * @property METHODS
 * @type {Object} TYPES
 * @default {
 *     stack
 *     wizard
 * }
 */
Route.TYPES = require( './type' );

/**
 * @static
 * @property METHODS
 * @type {Array} METHODS
 * @default [ 'GET', 'POST', 'PUT', 'DELETE' ]
 */
Route.METHODS = [ 'GET', 'POST', 'PUT', 'DELETE' ];

/**
 * @static
 * @todo
 * @type {Object}
 * @default {}
 */
Route.PREREQUESITES = {};

/**
 * Trying to dispatch an instanced Route.
 * @throw Error
 */
Route.prototype.dispatch = function () {
    throw new Error([
        "Are you constructing a new Router Type?",
        "It seems that you didn't placed .dispatch on it's prototype..."
    ].join(" "));
};

/* private methods */
