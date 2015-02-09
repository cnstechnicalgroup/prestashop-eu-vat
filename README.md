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

PrestaShop setup
----------------

This script will create specific price entries for every country associated with the tax_rules_group ID specified in the config.js plus a specific price for id_country 0 (All countries) set to the product price + EU tax rate.

For example, configure a Tax Rule with specific country entries as follows:

| Country     |State | Zip/Postal code | Behavior      | Tax    | Description |
|-------------|------|-----------------|---------------|--------|-------------|
| France      |  --  |              -- | This tax only | 20.00% |             | 
| Allemagne   |  --  |              -- | This tax only | 20.00% |             | 
| Belgique    |  --  |              -- | This tax only | 20.00% |             | 
| Luxembourg  |  --  |              -- | This tax only | 20.00% |             | 
| ...         |  --  |              -- | This tax only | 20.00% |             | 

License
-------

GPLv2

Author Information
------------------

Created by Sam Morrison
https://www.twitter.com/samcns
