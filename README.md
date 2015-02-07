prestashop-eu-vat
========

This script adds specific price entries for app products every EU countries.

Requirements
------------

* node.js
* npm

Installation
--------------

First, git clone the project:
```bash
git clone git@github.com:cnstechnicalgroup/prestashop-eu-vat.git
cd prestashop-eu-vat/
```

Install the node modules:
```bash
npm install
```

Configuration
------------

Copy _config.js to config.js and modify it to match your DB settings:
```javascript
var config = {
    db_config: {
        host: 'localhost',
        user: 'prestashop',
        password: 'password',
        database: 'prestashop',
        multipleStatements: true
    },
    // This is found in Localization > Tax Rules (ID)
    tax_rules_group: 5
}
```

Run
---

To run the script and generate specific price entries for all products, use the following command:
```bash
node app.js
```

License
-------

GPLv2

Author Information
------------------

Created by Sam Morrison
https://www.twitter.com/samcns
