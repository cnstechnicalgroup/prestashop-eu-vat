'use strict'

var Promise = require('bluebird');
var mysql = Promise.promisifyAll(require('mysql'));
var config = require('./config');
var connection = mysql.createConnection(config.db_config);
var countries = [];
var specificPriceInserts = [];

// SQL: Return all products to get id_product and id_tax_rules_group
var productSQL = 'SELECT id_product, price FROM prestashop.ps_product WHERE id_product IN (3, 4, 5); ';

// SQL: Get all EU country IDs
var euCountryIDsSQL = "SELECT tr.id_country, t.rate FROM ps_tax_rule AS tr JOIN ps_tax AS t ON t.id_tax = tr.id_tax WHERE tr.id_tax_rules_group = 7 AND tr.id_tax = 5; "

// SQL: Set all product id_tax_rules_group to 7
var idTaxRulesGroupSQL = "UPDATE ps_product SET id_tax_rules_group = 7 WHERE id_product IN (3, 4, 5); UPDATE ps_product_shop SET id_tax_rules_group = 7 WHERE id_product IN (3, 4, 5);";

// Run idTaxRulesGroupSQL
connection.query(idTaxRulesGroupSQL, function(err, result) {
    if (err) {
        connection.rollback(function() {
            throw err;
        });
    }
});

var createSpecificPriceInserts = function(product, countries) {
    countries.forEach(function(country) {
        var specificPrice = {
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
        }

        // Add specific price to object
        specificPriceInserts.push(specificPrice);
    });
}

/**
 * The ps_specific_price table doesn't have a unique
 * key on the multi-key index which includes id_product
 * and id_country. This INSERT INTO handles the upsert.
 **/

var insertSpecificPrice = function(row) {
    var insertSQL = "INSERT INTO ps_specific_price " +
        " (id_specific_price_rule, " +
        "  id_cart, " +
        "  id_product, " +
        "  id_shop, " +
        "  id_shop_group, " +
        "  id_currency, " +
        "  id_country, " +
        "  id_group, " +
        "  id_customer, " +
        "  id_product_attribute, " +
        "  price, " +
        "  from_quantity, " +
        "  reduction, " +
        "  reduction_tax, " +
        "  reduction_type, " +
        "  `from`, " +
        "  `to`) " +
        " SELECT " +
        row.id_specific_price_rule + ", " +
        row.id_cart + ", " +
        row.id_product + ", " +
        row.id_shop + ", " +
        row.id_shop_group + ", " +
        row.id_currency + ", " +
        row.id_country + ", " +
        row.id_group + ", " +
        row.id_customer + ", " +
        row.id_product_attribute + ", " +
        row.price + ", " +
        row.from_quantity + ", " +
        row.reduction + ", " +
        row.reduction_tax + ", " +
        "'" + row.reduction_type + "', " +
        "'" + row.from + "', " +
        "'" + row.to + "'" +
        " FROM ps_specific_price " +
        " WHERE NOT EXISTS (SELECT * FROM ps_specific_price WHERE id_product = " + row.id_product + " AND id_country = " + row.id_country + ") LIMIT 1;";

    connection.query(insertSQL, function(err, result) {
        if (err) {
            connection.rollback(function() {
                throw err;
            });
        }
    });
}

// Run these two queries during the same connection
var concatSQL = productSQL + euCountryIDsSQL;

// Start by getting all of the products that need to we updated
Promise.promisify(connection.query, connection)(concatSQL).then(function(results) {
    // Assign returned id_country and rate to countries
    var products = results[0][0];
    countries = results[0][1];
    // Filter for EU rate
    var euVAT = (countries[0].rate / 100);
    // Add the 'All Countries' record id_country = 0
    countries.push({
        id_country: 0,
        rate: euVAT
    });
    // Return the products results
    return products;
}).each(function(product) {
    // For each product, create a new specifit price entry
    // for every EU  country.
    createSpecificPriceInserts(product, countries);
}).then(function() {
    specificPriceInserts.forEach(function(row) {
        // Finally, insert the specific prices.
        insertSpecificPrice(row);
    });
    connection.end()
})