var Util = require( 'findhit-util' );

/**
 * Store handles The Wizard Session storage.
 * Initialization method for the Store.
 * Store uses a Session defined by the key passed with reqSessionKey.
 * @param {Object} The emvici Object
 */
function Store ( route ) {

    // If req doesn't have a session, this route type should NOT work, throw Error!
    if( ! route.req[ route.router.options.reqSessionKey ] ) {
        throw new TypeError([
            "emvici-router/lib/type/wizard needs some kind of session.",
            "You should use some session middleware before `.use` emvici-router.",
            "In case you have one and it doesn't place it at `req.session`, please",
            "specify in which key it sits by giving `reqSessionKey` option to",
            "emvici-router constructor options.",

            "Example: `var router = require( 'emvici-router' )({ reqSessionKey: 'YOLO' })`"
            ].join( " " ));
    }

    // Save route on this instance
    Object.defineProperty( this, 'route', {
        enumerable: false,
        writable: false,
        value: route,
    });

    // loads the Store saved in Store extending this Store.
    this.useOrAppend();

    // Check for steps data object
    this.data = Util.is.Object( this.data ) && this.data || {};

    // Active branches
    this.activeBranches = Util.is.Array( this.activeBranches ) && this.activeBranches || [];

    // Processed steps
    this.processedSteps = Util.is.Array( this.processedSteps ) && this.processedSteps || [];

    // Current step
    this.current = Util.is.String( this.current ) && this.current || null;

};

// Export Store
module.exports = Store;

/* instance methods */

/**
 * Checks whether the branch exists in the Store
 *
 * @param  {Branch}     branch The Branch to be checked
 * @return {Boolean}    True on success False otherwise.
 */
Store.prototype.branched = function( branch ) {
    return this.activeBranches.indexOf( branch ) !== -1;
};

/**
 * Adds a Branch into the Store.
 *
 * @param  {Branch} branch The branch to be added to the Store.
 * @return {Boolean} True on success False otherwise.
 */
Store.prototype.branch = function( branch ) {
    if( this.activeBranches.indexOf( branch ) !== -1 ) {
        return false;
    }

    // add the branch
    this.activeBranches.push( branch );

    return true;
};

/**
 * Removes the Branch from the Store.
 *
 * @param  {Branch} branch The Branch to be removed.
 * @return {Boolean} True on success False otherwise.
 */
Store.prototype.unbranch = function( branch ) {
    var i;

    if( ( i = this.activeBranches.indexOf( branch ) ) === -1 ) {
        return false;
    }

    this.activeBranches.splice( i, 1 );

    return true;
};

/**
 * Checks if a Step was processed.
 *
 * @param  {Step} step  The Step to check for.
 * @return {Boolean} True on success False otherwise.
 */
Store.prototype.processed = function( step ) {
    return this.processedSteps.indexOf( step ) !== -1;
};

/**
 * Adds a Step to the Processed List.
 *
 * @param  {Step} step  The Step to add to the List of Processed Steps.
 * @return {Boolean}    True on success False otherwise.
 */
Store.prototype.process = function ( step ) {
    if( this.processedSteps.indexOf( step ) !== -1 ) {
        return false;
    }

    this.processedSteps.push( step );

    return true;
};

/**
 * Remove a Step from the processed List.
 *
 * @param  {Step} step The Step to remove from the List of Processed Steps.
 * @return {Boolean} True on success False otherwise.
 */
Store.prototype.unprocess = function( step ) {
    var i;

    if( ( i = this.processedSteps.indexOf( step ) ) === -1 ) {
        return false;
    }

    this.processedSteps.splice( i, 1 );

    return true;
};

/**
 * Sets a Step as the Current Step.
 * @param {Step} step The Step to be set as current.
 */
Store.prototype.currentStep = function ( step ) {

    // If there is no `step` provided, it means that we wan't to get it!
    if( ! step ) {
        return this.current;
    }

    // Otherwise, lets set it!
    this.current = step;

};

/**
 * Checks if a Store exists in a Wizard Session.
 * If so, Uses the Wizard Session Store.
 * If Not creates saves it in the Wizard Session.
 */
Store.prototype.useOrAppend = function () {

    var route = this.route,
        req = route.req,
        session = req[ route.router.options.reqSessionKey ],
        wizardsOnThisSession =
            Util.is.Object( session.wizards ) && session.wizards ||
            ( session.wizards = {} );

    // If there is already a session for this wizard route
    if( wizardsOnThisSession[ route.id ] ) {
        // Extend this store with it
        Util.extend( this, wizardsOnThisSession[ route.id ] );
    }

    // Then, ALWAYS, whether it exists or not, bind this store into a session
    wizardsOnThisSession[ route.id ] = this;

};

/**
 * Deletes this wizard session.
 */
Store.prototype.destroy = function () {

    var route = this.route,
        req = route.req,
        session = req[ route.router.options.reqSessionKey ],
        wizardsOnThisSession =
            Util.is.Object( session.wizards ) && session.wizards ||
            ( session.wizards = {} );

    delete wizardsOnThisSession[ route.id ];

};

/**
 * Gets a value from the Store by its Key or a Default
 * @param  {String|Number} key (required) A key to search for in the Store
 * @param  {Mixed}  defaultValue (optional) The Default Value in case the key is inexistant
 * @return {Mixed}  Returns the found Value or the Default Value
 */
Store.prototype.get = function ( key, defaultValue ) {
    if( ! key ) {
        throw new Error( "You must provide a key for getting the value" );
    }

    return this.data[ key ] || defaultValue;
};

/**
 * Sets a value in a Store by a Key
 * @param {String|Number} key   (required) The Key for the value to be saved
 * @param {Mixed} value The value to be saved
 */
Store.prototype.set = function ( key, value ) {
    if( ! key ) {
        throw new Error( "You must provide a key for store the value" );
    }

    this.data[ key ] = value;

    return this;
};
