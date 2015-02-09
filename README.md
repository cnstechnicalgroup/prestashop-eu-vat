prestashop-eu-vat
========

This script adds specific price entries for every EU country as well as a single flat price (retail price + EU VAT rate) for every product.

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
| Autriche    |  --  |              -- | This tax only | 20.00% |             | 
| Belgique    |  --  |              -- | This tax only | 20.00% |             | 
| ...         |  --  |              -- | This tax only | 20.00% |             | 

Set tax_rules_group to the value of this tax rule before running.

The script will create specific price entries similar to the following for every product:

| Rule | Combination      | Currency        | Country         | Group       | Customer        | Fixed price | Impact  | Period      | From (quantity) |
|------|------------------|-----------------|-----------------|-------------|-----------------|-------------|---------|-------------|-----------------|
| --   | All combinations | All currencies  | All countries   | All groups  | All customers   |    165,00 € | --      | Unlimited   |               1 |
| --   | All combinations | All currencies  | Allemagne       | All groups  | All customers   |          -- | --      | Unlimited   |               1 |
| --   | All combinations | All currencies  | Autriche        | All groups  | All customers   |          -- | --      | Unlimited   |               1 |
| --   | All combinations | All currencies  | Belgique        | All groups  | All customers   |          -- | --      | Unlimited   |               1 |
| --   | All combinations | All currencies  | ...             | All groups  | All customers   |          -- | --      | Unlimited   |               1 |

License
-------

GPLv2

Author Information
------------------

Created by Sam Morrison
https://www.twitter.com/samcns
