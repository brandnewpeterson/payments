
//Functional tests

process.env.NODE_ENV = 'test';
var http = require('http');
var assert = require('assert')
var app = require('../app.js');
var Browser = require('zombie');
var fs = require('fs');


describe('purchase page', function() {

    before(function() {
        this.server = http.createServer(app).listen(3000);
        this.browser = new Browser({ site: 'http://localhost:3000' });
    });
    // load the purchase page
    beforeEach(function(done) {
        this.browser.visit('/', done);
    });

    it('should show contact a form', function() {
        assert.ok(this.browser.success);
    });

    it('should refuse empty submissions', function(done) {
        var browser = this.browser;
        browser.pressButton('submit').then(function() {
            assert.ok(browser.success);
            assert.equal(browser.text('p'), 'Please correct the following errors:');
        }).then(done, done);
    });

    it('should refuse alphabetic price', function(done) {
        var browser = this.browser;
        browser.fill(
            'price', 'abc'
        )
        .pressButton('submit')
        .then(function() {
            assert.ok(browser.success);
            var response = browser.text('body');
            assert.equal(response.indexOf("A purchase price is required, formated with a decimal point where appropriate.") > -1, true);
        }).then(done, done);
    });

    it('should accept numeric price', function(done) {
        var browser = this.browser;
        browser.fill(
            'price', '50.00'
        )
        .pressButton('submit')
        .then(function() {
            assert.ok(browser.success);
            var response = browser.text('body');
            assert.equal(response.indexOf("A purchase price is required, formated with a decimal point where appropriate.") > -1, false);
        }).then(done, done);
    });

    var nameFields =  ['customerName1', 'customerName2', 'ccHolder1', 'ccHolder2'];
    for (var f in nameFields){
        it('should refuse numbers in ' + nameFields[f] + ' field', function(done) {
            var browser = this.browser;
            browser.fill(
                f, 'abc1'
            )
            .pressButton('submit')
            .then(function() {
                assert.ok(browser.success);
                var response = browser.text('body');
                assert.equal(response.indexOf(" field must contain only letters.") > -1, true);
            }).then(done, done);
        });
    }

    var mixedGoodCreditCardNums = [
        4929929717576532,
        4929166462935130,
        4716194934135136,
        5267765957411809,
        5192952969745024,
        5149560115517496,
        340628305953785,
        371130167093950,
        340226681237210
    ];

    for (var c in mixedGoodCreditCardNums){
        it('should accept plausible credit card numbers like ' + mixedGoodCreditCardNums[c], function(done) {
            var browser = this.browser;
            browser.fill(
                'ccNumber', mixedGoodCreditCardNums[c]
            )
            .pressButton('submit')
            .then(function() {
                assert.ok(browser.success);
                var response = browser.text('body');
                assert.equal(response.indexOf("A properly formatted credit card number is required.") == -1, true);
            }).then(done, done);
        });
    }

    var mixedBadCreditCardNums = [
        49299297175765,
        8980980898,
        9842342387
    ];

    for (var c in mixedBadCreditCardNums){
        it('should refuse malformed credit card numbers like ' + mixedBadCreditCardNums[c], function(done) {
            var browser = this.browser;
            browser.fill(
                'ccNumber', mixedBadCreditCardNums[c]
            )
            .pressButton('submit')
            .then(function() {
                assert.ok(browser.success);
                var response = browser.text('body');
                assert.equal(response.indexOf('A properly formatted credit card number is required.') > -1, true);
            }).then(done, done);
        });
    }

    var dateFields =  ['ccExpirationMonth', 'ccExpirationYear'];
    for (var f in dateFields){
        it('should refuse letters in ' + dateFields[f] + ' field', function(done) {
            var browser = this.browser;
            browser.fill(
                f, '20a'
            )
            .pressButton('submit')
            .then(function() {
                assert.ok(browser.success);
                var response = browser.text('body');
                assert.equal(response.indexOf(' must contain only numbers.') > -1, true);
            }).then(done, done);
        });
    }


    it('should refuse long month input', function(done) {
        var browser = this.browser;
        browser.fill(
            'ccExpirationMonth', '123'
        )
        .pressButton('submit')
        .then(function() {
            assert.ok(browser.success);
            var response = browser.text('body');
            assert.equal(response.indexOf("Credit card expiration month must contain 1 or 2 digits.") > -1, true);
        }).then(done, done);
    });

    var badYears =  [12, 12345];
    for (var f in badYears){
        it('should refuse too long or short years', function(done) {
            var browser = this.browser;
            browser.fill(
                'ccExpirationYear', badYears[f]
            )
            .pressButton('submit')
            .then(function() {
                assert.ok(browser.success);
                var response = browser.text('body');
                assert.equal(response.indexOf("Credit card expiration year must contain 4 digits.") > -1, true);
            }).then(done, done);
        });

    }

    it('should refuse letters in the CVV field', function(done) {
        var browser = this.browser;
        browser.fill(
            'ccCVV', 'a123'
        )
        .pressButton('submit')
        .then(function() {
            assert.ok(browser.success);
            var response = browser.text('body');
            assert.equal(response.indexOf("The credit card CVV code can contain only numbers") > -1, true);
        }).then(done, done);
    });

    it('should refuse too short CVV field for AMEX', function(done) {
        var browser = this.browser;
        browser.fill(
            'ccCVV', '123'
        )
        .fill(
            'ccNumber', '340628305953785'
        )
        .pressButton('submit')
        .then(function() {
            assert.ok(browser.success);
            var response = browser.text('body');
            assert.equal(response.indexOf("The CVV code must be 4 digits for AMEX.") > -1, true);
        }).then(done, done);
    });

    it('should refuse too long CVV field for Visa/MC', function(done) {
        var browser = this.browser;
        browser.fill(
            'ccCVV', '1234'
        )
        .fill(
            'ccNumber', '5267765957411809'
        )
        .pressButton('submit')
        .then(function() {
            assert.ok(browser.success);
            var response = browser.text('body');
            assert.equal(response.indexOf("The CVV code must be 3 digits.") > -1, true);
        }).then(done, done);
    });

    it('should refuse non-USD AMEX attempts', function(done) {
        var browser = this.browser;
        browser.select(
            'currency', 'THB'
        )
        .fill(
            'ccNumber', '340628305953785'
        )
        .pressButton('submit')
        .then(function() {
            assert.ok(browser.success);
            var response = browser.text('body');
            assert.equal(response.indexOf("AMEX payments can only be made in US Dollars.") > -1, true);
        }).then(done, done);
    });

    it('should accept USD AMEX attempts', function(done) {
        var browser = this.browser;
        browser.select(
            'currency', 'USD'
        )
        .fill(
            'ccNumber', '340628305953785'
        )
        .pressButton('submit')
        .then(function() {
            assert.ok(browser.success);
            var response = browser.text('body');
            assert.equal(response.indexOf("AMEX payments can only be made in US Dollars.") == -1, true);
        }).then(done, done);
    });

    var allFields = {
        'price' :  'price',
        'customerName1' : 'customer\'s first name',
        'customerName2' : 'customer\'s last name',
        'ccHolder1' : 'credit card holder\'s first name',
        'ccHolder2' : 'credit card holder\'s last name',
        'ccNumber' : 'credit card number',
        'ccExpirationMonth' : 'expiration month',
        'ccExpirationYear' : 'expiration year',
        'ccCVV' : 'CVV'
    };

    for (var f in allFields){
        it('should repopulate ' + allFields[f] + ' field on error', function(done) {
            var browser = this.browser;
            browser.fill(
                f, 'MacGuffin'
            )
            .pressButton('submit')
            .then(function() {
                assert.ok(browser.success);
                var response = browser.html();
                assert.equal(response.indexOf("MacGuffin") > -1, true);
            }).then(done, done);
        });

    }

    var currs = [ 'USD', 'EUR', 'THB', 'HKD', 'SGD', 'AUD'];

    for (var c in currs){
        it('should reselect ' + currs[c] + ' on error', function(done) {
            var browser = this.browser;
            browser.select(
                'currency', currs[c]
            )
            .pressButton('submit')
            .then(function() {
                assert.ok(browser.success);
                var response = browser.html();
                assert.equal(response.indexOf(currs[c]) > -1, true);
            }).then(done, done);
        });

    }

    var payPalCurrs = [ 'USD', 'EUR', 'AUD'];
    for (var c in payPalCurrs){
        it('should use PayPal with ' + payPalCurrs[c] + ' and display success message (may time out -- confirm in actual browser)', function(done) {
            this.timeout(20000);
            var browser = this.browser;
            browser.select(
                'currency', brainTreeCurrs[c]
            )
            .fill(
                'price' ,  '37.00'
            )
            .fill(
                'customerName1' , 'Billy'
            )
            .fill(
                'customerName2' , 'Mack'
            )
            .fill(
                'ccHolder1' , 'Billy'
            )
            .fill(
                'ccHolder2' , 'Mack'
            )
            .fill(
                'ccNumber' , '340628305953785'
            )
            .fill(
                'ccExpirationMonth' , '06'
            )
            .fill(
                'ccExpirationYear' , '2018'
            )
            .fill(
                'ccCVV' , '1234'
            )
            .pressButton('submit')
            .then(function() {
                var response = browser.text('body');
                console.log(response);
                assert.equal(response.indexOf("Payment success. Details follow") > -1, true);
            }).then(done, done);
        });
    }

    var brainTreeCurrs = [ 'THB', 'HKD', 'SGD'];
    for (var c in brainTreeCurrs){
        it('should use Braintree with ' + brainTreeCurrs[c] + ' and display success message (may time out -- confirm in actual browser)', function(done) {
            this.timeout(20000);
            var browser = this.browser;
            browser.select(
                'currency', brainTreeCurrs[c]
            )
            .fill(
                'price' ,  '50.00'
            )
            .fill(
                'customerName1' , 'Billy'
            )
            .fill(
                'customerName2' , 'Mack'
            )
            .fill(
                'ccHolder1' , 'Billy'
            )
            .fill(
                'ccHolder2' , 'Mack'
            )
            .fill(
                'ccNumber' , '4111111111111111'
            )
            .fill(
                'ccExpirationMonth' , '06'
            )
            .fill(
                'ccExpirationYear' , '2018'
            )
            .fill(
                'ccCVV' , '123'
            )
            .pressButton('submit')
            .then(function() {
                var response = browser.text('body');
                console.log(response);
                assert.equal(response.indexOf("Payment success. Details follow") > -1, true);
            }).then(done, done);
        });
    }

    it('should display error message with bad inputs to Braintree (may time out -- confirm in actual browser)', function(done) {
        this.timeout(20000);
        var browser = this.browser;
        browser.select(
            'currency', 'THB'
        )
        .fill(
            'price' ,  '3000.00'
        )
        .fill(
            'customerName1' , 'Billy'
        )
        .fill(
            'customerName2' , 'Mack'
        )
        .fill(
            'ccHolder1' , 'Billy'
        )
        .fill(
            'ccHolder2' , 'Mack'
        )
        .fill(
            'ccNumber' , '4000111111111115'
        )
        .fill(
            'ccExpirationMonth' , '06'
        )
        .fill(
            'ccExpirationYear' , '2018'
        )
        .fill(
            'ccCVV' , '123'
        )
        .pressButton('submit')
        .then(function() {
            var response = browser.text('body');
            console.log(response);
            assert.equal(response.indexOf("Payment failure. Details follow:") > -1, true);
        }).then(done, done);
    });

    it('should display error message with bad inputs to Paypal (may time out -- confirm in actual browser)', function(done) {
        var pretransactionDBSize =
        this.timeout(20000);
        var browser = this.browser;
        browser.select(
            'currency', 'USD'
        )
        .fill(
            'price' ,  '300.00'
        )
        .fill(
            'customerName1' , 'Billy'
        )
        .fill(
            'customerName2' , 'Mack'
        )
        .fill(
            'ccHolder1' , 'Billy'
        )
        .fill(
            'ccHolder2' , 'Mack'
        )
        .fill(
            'ccNumber' , '340628305953785'
        )
        .fill(
            'ccExpirationMonth' , '06'
        )
        .fill(
            'ccExpirationYear' , '2010'
        )
        .fill(
            'ccCVV' , '123'
        )
        .pressButton('submit')
        .then(function() {
            var response = browser.text('body');
            console.log(response);
            assert.equal(response.indexOf("Payment failure. Details follow:") > -1, true);
        }).then(done, done);
    });

    it('should write proof of successful Braintree purchase to DB (may time out -- confirm in actual browser)', function(done) {
        this.timeout(20000);
        var browser = this.browser;
        dbSizePre = getFilesizeInBytes(getUserDataPath() + "/purchases.db");
        browser.select(
            'currency', 'THB'
        )
        .fill(
            'price' ,  '58.00'
        )
        .fill(
            'customerName1' , 'Billy'
        )
        .fill(
            'customerName2' , 'Mack'
        )
        .fill(
            'ccHolder1' , 'Billy'
        )
        .fill(
            'ccHolder2' , 'Mack'
        )
        .fill(
            'ccNumber' , '4111111111111111'
        )
        .fill(
            'ccExpirationMonth' , '06'
        )
        .fill(
            'ccExpirationYear' , '2018'
        )
        .fill(
            'ccCVV' , '123'
        )
        .pressButton('submit')
        .then(function() {
            var response = browser.text('body');
            console.log(response);
            dbSizePost = getFilesizeInBytes(getUserDataPath() + "/purchases.db")
            assert.equal(dbSizePre<dbSizePost, true);
        }).then(done, done);
    });

    it('should write errors from unsuccessful Braintree purchase to DB (may time out -- confirm in actual browser)', function(done) {
        this.timeout(20000);
        dbSizePre = getFilesizeInBytes(getUserDataPath() + "/purchases.db")
        var browser = this.browser;
        browser.select(
            'currency', 'THB'
        )
        .fill(
            'price' ,  '3000.00'
        )
        .fill(
            'customerName1' , 'Billy'
        )
        .fill(
            'customerName2' , 'Mack'
        )
        .fill(
            'ccHolder1' , 'Billy'
        )
        .fill(
            'ccHolder2' , 'Mack'
        )
        .fill(
            'ccNumber' , '4000111111111115'
        )
        .fill(
            'ccExpirationMonth' , '06'
        )
        .fill(
            'ccExpirationYear' , '2018'
        )
        .fill(
            'ccCVV' , '123'
        )
        .pressButton('submit')
        .then(function() {
            var response = browser.text('body');
            console.log(response);
            dbSizePost = getFilesizeInBytes(getUserDataPath() + "/purchases.db")
            assert.equal(dbSizePre<dbSizePost, true);
        }).then(done, done);
    });

    it('should write proof of successful Paypal purchase to DB (may time out -- confirm in actual browser)', function(done) {
        this.timeout(20000);
        dbSizePre = getFilesizeInBytes(getUserDataPath() + "/purchases.db")

        var browser = this.browser;
        browser.select(
            'currency', 'USD'
        )
        .fill(
            'price' ,  '50.00'
        )
        .fill(
            'customerName1' , 'Billy'
        )
        .fill(
            'customerName2' , 'Mack'
        )
        .fill(
            'ccHolder1' , 'Billy'
        )
        .fill(
            'ccHolder2' , 'Mack'
        )
        .fill(
            'ccNumber' , '340628305953785'
        )
        .fill(
            'ccExpirationMonth' , '06'
        )
        .fill(
            'ccExpirationYear' , '2018'
        )
        .fill(
            'ccCVV' , '1234'
        )
        .pressButton('submit')
        .then(function() {
            var response = browser.text('body');
            console.log(response);
            dbSizePost = getFilesizeInBytes(getUserDataPath() + "/purchases.db")
            assert.equal(dbSizePre<dbSizePost, true);
        }).then(done, done);
    });

    it('should write proof of unsuccessful Paypal purchase to DB (may time out -- confirm in actual browser)', function(done) {
        this.timeout(20000);
        dbSizePre = getFilesizeInBytes(getUserDataPath() + "/purchases.db")

        var browser = this.browser;
        browser.select(
            'currency', 'USD'
        )
        .fill(
            'price' ,  '50.00'
        )
        .fill(
            'customerName1' , 'Billy'
        )
        .fill(
            'customerName2' , 'Mack'
        )
        .fill(
            'ccHolder1' , 'Billy'
        )
        .fill(
            'ccHolder2' , 'Mack'
        )
        .fill(
            'ccNumber' , '5192952969745024'
        )
        .fill(
            'ccExpirationMonth' , '06'
        )
        .fill(
            'ccExpirationYear' , '2018'
        )
        .fill(
            'ccCVV' , '123'
        )
        .pressButton('submit')
        .then(function() {
            var response = browser.text('body');
            console.log(response);
            dbSizePost = getFilesizeInBytes(getUserDataPath() + "/purchases.db")
            assert.equal(dbSizePre<dbSizePost, true);
        }).then(done, done);
    });

    after(function(done) {
        this.server.close(done);
    });

    function getFilesizeInBytes(filename) {
        var stats = fs.statSync(filename)
        var fileSizeInBytes = stats["size"]
        return fileSizeInBytes
    }

    function getUserDataPath() {
        var path = require('path');
        console.log("Look for testing DB called 'purchases.db' in:");
        console.log(path.dirname(process.execPath));
        return path.dirname(process.execPath);
    }

});
