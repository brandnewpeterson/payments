# payments
Code Test #1 -- Hotel Quickly

GATEWAY CREDENTIALS

Very Important: Before running the app, please supply your own Paypal/Braintree credentials inside the root-level creds.json file.

PLEA FOR LENIENCY

Go easy on me: A few days ago, I'd never used node.js -- but what a cool thing it is! I inquired about Android-specific coding jobs, but was given this test, so I took the challenge and I'm glad I did. (You can't say you can properly write mobile apps without understanding the server-side interactions.)

MODULARITY/OBJECT ORIENTED-NESS

The spec stipulates that additional gateways should be easy to add. While I've added the two required ones, some refactoring would likely help to make it easier to add others (see above plea). I'd welcome input on how to best do that.

FRAMEWORK

I used express (and liked it very much), along with its form validators.

DATABASE BACKING

The spec stipulates that transactional data to the gateways needs to be stored. I've embedded a nedb database as proof of concept for this (perhaps in violation of the no-3rd party library rules). When you run the app, the console will tell you where on your test system this db has been written. In the real world, we'd use mongodb, etc., but nedb is meant to show a proof of concept of db backing. You can cat/tail the purchases.db file in the local test directory to see records being added. (I did not implement the RUD parts of CRUD.)

TESTS

'npm test' will run a slew of unit test using mocha and a zombie browser (perhaps this is another no-3rd-pary-libary violation, but these are dev-only dependencies!). The latter tests run are more like functional tests. Those that query the PayPal/Braintree servers may timeout in spite of my best efforts to instruct zombie not to (it can take up to 20 seconds for PayPal to respond, unfortunately). I've tried the prone-to-timeout tests in a real browser and all seem fine.

THANKS

Strange to say, but I had a great time with this test. I learned a lot about node.js coding in short amount of time by gorging on their docs and the many tutorials written by other devs -- a very fascinating exercise, and a welcome break from the Android libraries. Please feel free to contact with me with any questions at brandnewpeterson@gmail.com.

