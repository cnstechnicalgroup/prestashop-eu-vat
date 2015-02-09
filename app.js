'use strict'

var Promise = require("bluebird");
var mysql = require('mysql-promise2');
var using = Promise.using;
var config = require('./config').config;
var pool = mysql.createPool(config.db_config);
var tax_rules_group = config.tax_rules_group;
var countries = [];

//
// All SQL here
//

// SQL: Return all products to get id_product and id_tax_rules_group
var product_sql = "SELECT id_product, price FROM prestashop.ps_product; ";

// SQL: Get all EU country IDs
var eu_country_ids_sql = "SELECT tr.id_country, t.rate FROM ps_tax_rule AS tr JOIN ps_tax AS t ON t.id_tax = tr.id_tax WHERE tr.id_tax_rules_group = " + tax_rules_group + " AND tr.id_tax = 5; "

// Run those first two queries during the initial query 
var product_and_country_sql = product_sql + eu_country_ids_sql;

// SQL: Set all product id_tax_rules_group to 7
var id_tax_rules_group_sql = "UPDATE ps_product SET id_tax_rules_group = " + tax_rules_group + "; UPDATE ps_product_shop SET id_tax_rules_group = " + tax_rules_group + ";";

// SQL: Update existing specific price
var update_specific_price_sql = "UPDATE ps_specific_price SET price = ? WHERE id_product = ? AND id_country = ?";

// SQL: Insert new specific price
var insert_specific_price_sql = "INSERT INTO ps_specific_price SET ? ";

// Set all product id_tax_rules_group to config.tax_rules_group value

using(pool.getTransaction(), function(connection) {
  connection.queryAsync(id_tax_rules_group_sql).catch(function(err) {
      connection.rollback(function() {
        throw err;
      });
  });
});

// Format a single specific price row
var createSpecificPriceInsert = function(product, country) {
    return {
        id_specific_price_rule: 0,
        id_cart: 0,
        id_product: product.id_product,
        id_shop: 0,
        id_shop_group: 0,
        id_currency: 0,
        id_country: country.id_country,
        id_group: 0,
        id_customer: 0,
        id_product_attribute: 0,
        price: (country.id_country == 0 ? (product.price + (product.price * country.rate)).toFixed(2) : -1),
        from_quantity: 1,
        reduction: 0,
        reduction_tax: 1,
        reduction_type: 'amount',
        from: '0000-00-00 00:00:00',
        to: '0000-00-00 00:00:00'
    };
}

// Create specific_price_rows object containing all possible
// specific price entries / updates.
var stageSpecificPrices = function(products, countries) {

    var specific_price_rows = [];

    // Filter for EU rate
    var eu_vat = (countries[0].rate / 100);
    // Add the 'All Countries' record id_country = 0
    countries.push({
        id_country: 0,
        rate: eu_vat
    });
    // Stage specific prices for processing
    products.forEach(function(product) {
        countries.forEach(function(country) {
            specific_price_rows.push(createSpecificPriceInsert(product, country));
        });
    });
    return specific_price_rows;
}

//
// Loop through every product in ps_product and create a specific
// price entry if none exists. Also create an 'All Countries' 
// entry with the flat price that includes the EU VAT rate.
//

using(pool.getTransaction(), function(connection) {
    // this callback is still pending
    return connection.queryAsync(product_and_country_sql).then(function(results) {
        // Assign returned id_country and rate to countries
        var products = results[0][0];
        countries = results[0][1];
        // Return the products results
        return stageSpecificPrices(products, countries);
    }).each(function(row) {
        // For each specific price, try to update it or insert as new
        var update_values = [row.price, row.id_product, row.id_country];
        connection.queryAsync(update_specific_price_sql, update_values).then(function(results) {
            if (results[0].affectedRows === 0) {
                connection.queryAsync(insert_specific_price_sql, row);
            }
        });
    }).catch (function(err) {
        console.log(err);
        // Rollback on error
        connection.rollback();
        throw err;
    });
}).finally(function() {
    // All done, close the pool connection
    pool.end(function() {
        console.log("all done.");
    });
});
