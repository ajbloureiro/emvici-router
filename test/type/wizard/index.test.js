var Util = require( 'findhit-util' ),
    Promise = require( 'bluebird' ),

    WizardRoute = require( '../../../lib/type/wizard' ),

    sinon = require( 'sinon' ),
    chai = require( 'chai' ),
    expect = chai.expect
    ;

describe( "WizardRoute", function () {
    it("shouldn't allow new WizarRoute, only WizardRoute.construct",function(){

        var errorMsg = [
        "You can't use WizardRoute directly to construct a new WizardRoute.",
        "Please use WizardRoute.construct method instead"
            ].join(" "),
            initError = new Error( errorMsg );

        expect( function(){
            new WizardRoute();
        } ).to.throw( initError );

    });
});
