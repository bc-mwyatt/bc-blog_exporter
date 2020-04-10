# bc-blog_exporter
A Node.js app you can run locally to export BigCommerce Blog Posts to a CSV.

# Prerequisites
You need an API account with the Content scope generated from your BigCommerce control panel.

For detailed instructions on setting up a BigCommerce API account, check the developer docs: https://developer.bigcommerce.com/api-docs

# Instructions
Create a file with the name `.env` in the root directory of the app. This is used to set the store URL and credentials for API requests.

## .env values
CLIENT={Your client ID}

STOREHASH={Your store hash}

TOKEN={Your auth token}

## Running the app
Once you've set up your .env file and installed dependencies with `npm install`, run `npm start` and a CSV file with your store's coupon codes will be generated in the app directory.

## Credit
bc-blog_exporter uses modified code from the [bc-couponexporter] (https://github.com/bdav87/bc-couponexporter) tool created by [Brian Davenport](https://github.com/bdav87). 
