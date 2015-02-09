'use strict'

//var mysql = require("mysql");
var Promise = require("bluebird");
var mysql = require('mysql-promise2');

/*
Promise.promisifyAll(mysql);
Promise.promisifyAll(require("mysql/lib/Connection").prototype);
Promise.promisifyAll(require("mysql/lib/Pool").prototype);*/
var using = Promise.using;
var config = require('./config').config;
var tax_rules_group = config.tax_rules_group;
var countries = [];
var specificPriceInserts = [];

// Create MySQL connection
var pool = mysql.createPool(config.db_config);
/*var getConnection = function() {
    return pool.getConnectionAsync().disposer(function(connection) {
        connection.release();
    });
}*/

//
// All SQL here
//

// SQL: Return all products to get id_product and id_tax_rules_group
var productSQL = 'SELECT id_product, price FROM prestashop.ps_product WHERE id_product IN (3, 4, 5); ';

// SQL: Get all EU country IDs
var euCountryIDsSQL = "SELECT tr.id_country, t.rate FROM ps_tax_rule AS tr JOIN ps_tax AS t ON t.id_tax = tr.id_tax WHERE tr.id_tax_rules_group = " + tax_rules_group + " AND tr.id_tax = 5; "

// Run those first two queries during the initial query 
var productAndCountrySQL = productSQL + euCountryIDsSQL;

// SQL: Set all product id_tax_rules_group to 7
var idTaxRulesGroupSQL = "UPDATE ps_product SET id_tax_rules_group = " + tax_rules_group + " WHERE id_product IN (3, 4, 5); UPDATE ps_product_shop SET id_tax_rules_group = " + tax_rules_group + " WHERE id_product IN (3, 4, 5);";

// SQL: Update existing specific price
var updateSpecificPriceSQL = "UPDATE ps_specific_price SET price = ? WHERE id_product = ? AND id_country = ?";

// SQL: Insert new specific price
var insertSQL = "INSERT INTO ps_specific_price ? ";

// Set all product id_tax_rules_group to config.tax_rules_group value
/*connection.query(idTaxRulesGroupSQL, function(err, result) {
    if (err) {
        connection.rollback(function() {
            throw err;
        });
    }
});*/
/*
// Create a json object for each new insert
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

var createSpecificPriceInsert = function(product, country) {
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
    return specificPrice;
}

// Update the specific price with the new flat rate
var updateSpecificPrice = function(row) {
    return using(getConnection(), function(connection) {
        return connection.queryAsync("UPDATE ps_specific_price SET price = " + row.price + " WHERE id_product = " + row.id_product + " AND id_country = " + row.id_country).then(function(results) {
            return results;
        }).
        catch (function(err) {
            connection.rollback();
            throw err;
        });
    });
};

// The ps_specific_price table doesn't have a unique
// key on the multi-key index which includes id_product
// and id_country. This INSERT INTO prohibits duplicates.
var insertSpecificPrice = function(row) {
    return using(getConnection(), function(connection) {
        var insertSQL = "INSERT INTO ps_specific_price ? "
        return connection.queryAsync(insertSQL, row).then(function(result) {
            console.log(connection);
            return result;
        }).
        catch (function(err) {
            connection.rollback();
            throw err;
        });
    });
}
*/

var stageSpecificPrices = function(products, countries) {

    var specificPriceRows = [];

    // Filter for EU rate
    var euVAT = (countries[0].rate / 100);
    // Add the 'All Countries' record id_country = 0
    countries.push({
        id_country: 0,
        rate: euVAT
    });
    // Stage specific prices for processing
    products.forEach(function(product) {
        countries.forEach(function(country) {
            specificPriceRows.push(createSpecificPriceInsert(product, country));
        });
    });

    return specificPriceRows;
}

//
// Loop through every product in ps_product and create a specific
// price entry if none exists. Also create an 'All Countries' 
// entry with the flat price that includes the EU VAT rate.
//

//using(getConnection(), function(connection) {
using(pool.getTransaction(), function(connection) {
    // this callback is still pending
    return connection.queryAsync(productAndCountrySQL).then(function(results) {
        // Assign returned id_country and rate to countries
        var products = results[0][0];
        countries = results[0][1];
        // Return the products results
        return stageSpecificPrices(products, countries);
    }).all(function(row) {
        // For each specific price, try to update it or insert as new
        var update_values = [row.price, row.id_product, row.id_country];
        return connection.queryAsync(updateSpecificPriceSQL, update_values).then(function(results) {
            if (results.affectedRows == 0) {
                return connection.queryAsync(insertSQL, row);
            }
        });
    }).
    catch (function(err) {
        console.log(err);
        connection.rollback();
        throw err;
    });
}).
finally(function() {
    // All done, close the pool connection
    pool.end(function() {
        console.log("all done.");
    });
});
