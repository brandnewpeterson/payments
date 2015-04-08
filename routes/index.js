var express = require('express');
var router = express.Router();
var paypal = require('paypal-rest-sdk');
var braintree = require('braintree');
var fs = require('fs');

var appRoot = process.cwd()

//Get payment gateway credentials.

try {
    var configJSON = fs.readFileSync(appRoot + "/creds.json");
    var creds = JSON.parse(configJSON.toString());
} catch (e) {
    console.error("File creds.json not found or is invalid: " + e.message);
    process.exit(1);
}

var paypalCreds = creds.paypal;
var braintreeCreds = creds.braintree;

/* GET Purchase page*/
router.get('/', function(req, res) {
    res.render('index', { title: 'Purchase Item' });
});

/* POST to Purchase Service */
router.post('/', function(req, res) {

    //Validate form

    //All fields are complete
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
        req.assert(f, 'The ' + allFields[f] + ' field is required.').notEmpty();
    }


    //Name fields are alpha only
    var nameFields = {
        'customerName1' : 'customer\'s first name',
        'customerName2' : 'customer\'s last name',
        'ccHolder1' : 'credit card holder\'s first name',
        'ccHolder2' : 'credit card holder\'s last name',
    };

    for (var f in nameFields){
        req.assert(f, 'The ' + nameFields[f] + ' field must contain only letters.').isAlpha();
    }

    //Price is well formatted.
    req.assert('price', 'A purchase price is required, formated with a decimal point where appropriate.').isCurrency();

    //Credit card number is well formatted
    req.assert('ccNumber', 'A properly formatted credit card number is required.').isCreditCard();


    //Date fields are numeric.
    var dateFields = {
        'ccExpirationMonth' : 'expiration month',
        'ccExpirationYear' : 'expiration year',
    };

    for (var f in dateFields){
        req.assert(f, 'The credit card ' + dateFields[f] + ' must contain only numbers.').isNumeric();
    }

    req.assert('ccExpirationMonth', 'Credit card expiration month must contain 1 or 2 digits.').isLength(1,2);

    req.assert('ccExpirationYear', 'Credit card expiration year must contain 4 digits.').isLength(4,4);

    req.assert('ccCVV', 'The credit card CVV code can contain only numbers').isNumeric();


    if (req.body.ccNumber.length == 15){
        req.assert('ccCVV', 'The CVV code must be 4 digits for AMEX.').isLength(4,4);
    }
    if (req.body.ccNumber.length > 15){
        req.assert('ccCVV', 'The CVV code must be 3 digits.').isLength(3,3);
    }

    if (req.body.currency != 'USD' && req.body.ccNumber.length == 15){
        req.assert('ccNumber', 'AMEX payments can only be made in US Dollars. Please change currency type.').isNull();
    }

    var db = req.db;

    //Repopulate form on error

    var validationErrors = req.validationErrors();
    if (validationErrors) {
        res.render('index', {
            title: 'Purchase Item',
            message: 'Please correct the following errors:',
            validationErrors: validationErrors,
            price: req.body.price,
            customerName1: req.body.customerName1,
            customerName2: req.body.customerName2,
            ccHolder1: req.body.ccHolder1,
            ccHolder2: req.body.ccHolder2,
            ccNumber: req.body.ccNumber,
            ccExpirationMonth: req.body.ccExpirationMonth,
            ccExpirationYear: req.body.ccExpirationYear,
            ccCVV: req.body.ccCVV,
            currency: req.body.currency
        });
    } else {

        //Paypal

        if (req.body.ccNumber.length == 15 ||
            (req.body.currency == 'USD' ||
            req.body.currency == 'EUR' ||
            req.body.currency == 'AUD')
        )
        {

            var card_data = {
                "type": "amex",
                "number": req.body.ccNumber,
                "expire_month": req.body.ccExpirationMonth,
                "expire_year": req.body.ccExpirationYear,
                "cvv2": req.body.ccCVV,
                "first_name": req.body.ccHolder1,
                "last_name": req.body.ccHolder2
            };

            var payment = {
                "intent": "sale",
                "payer": {
                    "payment_method": "credit_card",
                    "funding_instruments": [{
                        "credit_card": card_data
                    }]
                },
                "transactions": [{
                    "amount": {
                        "total": req.body.price,
                        "currency": req.body.currency,
                    },
                    "description": "My awesome payment."
                }]
            };


            paypal.configure(paypalCreds);

            paypal.payment.create(payment, function (error, payment) {
                if (error) {
                    //Display failure message
                    res.render('index', {
                        title: 'Purchase Item',
                        "paymentErrors":error
                    });
                    console.log(error);

                    //Record to DB
                    var doc = {
                        'purchase_type' : 'PayPal',
                        'errors' : error
                    }
                    db.insert(doc, function (err, newDoc) {
                    });

                } else {
                    //Display success message
                    res.render('index', {
                        title: 'Purchase Item',
                        "payment":payment
                    });
                    console.log(payment);

                    //Record to DB
                    var doc = {
                        'purchase_type' : 'PayPal',
                        'success_proof' : payment
                    }
                    db.insert(doc, function (payment, newDoc) {
                    });

                }
            });
        }

        //Braintree
        else{

            var gateway = braintree.connect({
                environment: braintree.Environment.Sandbox,
                merchantId: braintreeCreds.merchantId,
                publicKey: braintreeCreds.publicKey,
                privateKey: braintreeCreds.privateKey }
            );

            gateway.transaction.sale({
                amount: req.body.price,
                customer : {
                    first_name: req.body.customerName1,
                    last_name: req.body.customerName2
                },
                creditCard: {
                    cardholder_name: req.body.ccHolderName1 + " " + req.body.ccHolderName2,
                    cvv: req.body.ccCVV,
                    number: req.body.ccNumber,
                    expirationMonth: req.body.ccExpirationMonth,
                    expirationYear: req.body.ccExpirationYear
                }
            }, function (err, result) {
                if (err) throw err;

                if (result.success) {

                    //Display success message
                    res.render('index', {
                        title: 'Purchase Item',
                        "payment":'Braintree Transaction ID: ' + result.transaction.id
                    });
                    console.log('Braintree Transaction ID: ' + result.transaction.id);

                    //Record to DB
                    var doc = {
                        'purchase_type' : 'Braintree',
                        'success_proof' : result.transaction.id
                    }
                    db.insert(doc, function (err, newDoc) {
                    });
                } else {
                    //Display failure message
                    res.render('index', {
                        title: 'Purchase Item',
                        "paymentErrors":result.message
                    });
                    console.log(result.message);

                    //Record to DB
                    var doc = {
                        'purchase_type' : 'Braintree',
                        'errors' : result.message
                    }
                    db.insert(doc, function (err, newDoc) {
                    });
                }
            })

        }
    };
});

module.exports = router;
