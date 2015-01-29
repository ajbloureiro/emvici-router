var Util = require( 'findhit-util' ),
    Error = require( './error' ),

    debug = require( 'debug' )( 'emvici-router:path' );

// -----------------------------------------------------------------------------

/**
 * @namespace emvici-router
 * @class Path
 * @param {RegExp|String|Object|Array} pattern
 *        A RegExp.
 *        A String pattern.
 *        An options Object with a property called pattern.
 *        An Array of strings with patterns.
 * @param {Object} options Aditional options to be passed into the instance.
 *
 * @example
 * 	var path = new Path({
 * 		pattern : 'pattern'
 * 	});
 *
 * @example
 * 	var path = new Path('pattern',{
 *  	strict : true
 * 	});
 */
function Path ( pattern, options ) {

    //Populate the options object in case pattern receives the options Object.
    if( Util.is.Object( pattern ) ) {
        options = pattern;
        pattern = options.pattern;
    }

    // Check if pattern is either a String, Array or Regexp
    // If not, throw an error
    if( Util.isnt.String( pattern ) && Util.isnt.Array( pattern ) && Util.isnt.RegExp( pattern ) ) {
        throw new TypeError( "pattern isn't a valid option" );
    }

    /**
     * @property keys
     * @type {Array}
     * @default Empty Array
     */
    this.keys = [];
    /**
     * The options object of this Class
     * @property options
     * @type {[type]}
     */
    this.options = Util.is.Object( options ) && options || {};
    this.options.__proto__ = Path.defaultOptions;

    /**
     * @property pattern
     * @type {String|Array}
     */
    this.pattern = pattern;
    this.regexp = this.Pattern2RegExp();

    return this;

}

/**
 * @namespace Path
 * @static
 * @property defaultOptions
 * @type {Object} The default Object for the Path
 */
Path.defaultOptions = {
    /**
     * @property sensitive
     * @type {Boolean}
     * @default false
     */
    sensitive: false,
    /**
     * @property strict
     * @type {Boolean}
     * @default false
     */
    strict: false,
};

// Export Path
module.exports = Path;

/**
 * @method PatternAndParams2Url
 * @param {RegExp|String|Array<String>} pattern The Pattern to be converted
 *                                              into a regular expression.
 * @param {RegExp} returns The generated RegExp.
 */
Path.prototype.PatternAndParams2Url = function ( pattern, params ) {
    var url = pattern || this.pattern,
		keys = this.keys,
		_keys = [],
		i;

	// First replace the variables from path
	for( var i in keys ){
		_keys.push( keys[i].name );

		if( params[ keys[i].name ] ) {
            // Replace on url
            url = url.replace(
                new RegExp( '/:'+keys[i].name+'(\\([a-z|\/]*\\))?(\\?)?', 'i' ), '/'+ params[ keys[i].name ] );
        } else if( keys[i].required ) {
            throw new Error("A required param on path isn't here...");
        }
	}

	if ( params ){
		var parts = [];

		for( var i in params ) {

			// verify if it is a key
			if( _keys.indexOf( i ) > -1 )
				continue;

			parts.push( i +':'+ ( ( typeof params[i] == 'string' ) && params[i] || JSON.stringify( params[i] ) ) );
		}

		// Check if route has an multi argument acceptance
		url = url.match(/\/\*.*/i) && url.replace( /\/\*.*/i, '' ) || url;

		// Now apply the rest of params if we have the /** at the end of the url
		if( parts.length )
			url = url.replace( /\/$/i, '' ) +'/'+ parts.join('/');
	}

	return url;
};

/**
 * @namespace Path
 * @method Pattern2RegExp Generates a Path Regex.
 *  Uses the pattern given by param or at time of Instantiation.
 * @param {RegExp|String|Array<String>} pattern The Pattern to be converted
 *                                              into a regular expression.
 */
Path.prototype.Pattern2RegExp = function ( pattern ) {
    pattern = pattern || this.pattern;

    var keys = this.keys,

        options = this.options,
        sensitive = !! options.sensitive,
        strict = !! options.strict;

    // If url is already a RegExp, return it
    if ( Util.is.RegExp( pattern ) ) {
        return pattern;
    }

    // If url provided was an Array, we should concat it between parents
    if ( Util.is.Array( pattern ) ) {
        pattern = '(' + pattern.join( '|' ) + ')';
    }

    var regexp = this.regexp = new RegExp( ''
        + '^'
        + pattern
            .concat( strict ? '' : '/?' )
            .replace(/\/\(/g, '(?:/')
            .replace(/(\/)?(\.)?:(\w+)(?:(\(.*?\)))?(\?)?(\*)?/g, function( _, slash, format, key, capture, optional, star ){
                keys.push({ name: key, optional: !! optional });
                slash = slash || '';
                return ''
                    + ( optional ? '' : slash )
                    + '(?:'
                    + ( optional ? slash : '' )
                    + ( format || '') + ( capture || ( format && '([^/.]+?)' || '([^/]+?)' ) ) + ')'
                    + ( optional || '' )
                    + ( star ? '(/*)?' : '' );
            })
            .replace(/([\/.])/g, '\\$1')
            .replace(/\*/g, '(.*)')
        + '$',

        // Should it be case-sensitive?
        sensitive ? '' : 'i'

    );

    return regexp;
};

/**
 * Matches a url against the internally generated RegExp.
 * @namespace Path
 * @method match
 * @param  {String} url The Url to be tested.
 * @return {Boolean}     True on Success, False otherwise.
 */
Path.prototype.match = function ( url ) {
    return this.regexp.exec( url );
};

/**
 * Parses an Url and populates the key Object.
 * @param {[type]} url [description]
 * @return {Object} A Map representation of the Parameters in the url.
 * @example
 * 	path.Url2Params('http://www.queijodaserra.com?cabra=estrela&curado=velho')
 */
Path.prototype.Url2Params = function ( url ) {
    var params = {},
        keys = this.keys,
        m = this.regexp.exec( url ),
        i, len = m.length;

    for ( i = 1; i < len; ++i ) {
        var key = keys[i - 1];

        try {
            var val = 'string' == typeof m[i] ? decodeURIComponent(m[i]) : m[i];
        } catch ( parentErr ) {
            var err = new Error.InternalError( "Failed to decode param" );

            err.param = i;
            err.value = m[i];
            err.key = i;

            err.parent = parentErr;

            throw err;
        }

        if ( key ) {
            params[ key.name ] = val;
        } else {
            params[ n++ ] = val;
        }
    }

    return params;
};
