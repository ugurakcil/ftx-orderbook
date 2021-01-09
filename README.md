This is a service that simulates trading from FTX site. Unlike what the API offers, it collects assets in chunks through bids and asks. 
Also it enables transactions on the markets by specifying the reversed exchange rate purchase amount.

## Installation Steps

### 1. Require the Package

After extracting the files from Github to your working environment, run the following codes in the main directory.

```bash
npm install
```

### 2. Add the credentials

After the packages are installed, add the KEY and SECRET code from the FTX site in the config.js file.
Also, write the name you defined in the subaccount you will create on the FTX site.

```
"key": "blablabla",
"secret": "blablabla",
"subaccount": "node"
```
