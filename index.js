const config = require('./config.json')
const express = require('express')
const FTXHelper = require('./ftx-helper')
const _ = require('lodash')
const app = express()
const port = 3000

app.use(express.json()) // for parsing application/json
app.use(express.urlencoded({ extended: true })) // for parsing application/x-www-form-urlencoded

app.get('/', (req, res) => {
    res.json({
        'quote' : `${config.serviceAddress}:${port}/quote`,
        'account' : `${config.serviceAddress}:${port}/account`,
        'market' : `${config.serviceAddress}:${port}/market`,
        'costcalc' : `${config.serviceAddress}:${port}/costcalc`
    })
})

app.post('/quote', (req, res) => {
    if(!_.result(req.body, 'quote_currency') 
    || !_.result(req.body, 'base_currency')
    || !_.result(req.body, 'action') 
    || !_.result(req.body, 'amount')) {
        res.status(400).json({'success': false, 'message': 'Missing or null parameters'})
    }

    FTXHelper.checkCurrency(
        req.body.base_currency,
        req.body.quote_currency
    ).then((currency) => {
        if(!currency) {
            res.status(422).json({'success': false, 'message': 'Invalid currency pair'})
        }
        
        return FTXHelper.getOrderBook(
            currency.base,
            currency.quote
        ).then((orderbook) => {
            if(orderbook.result && orderbook.success === true) {
                return { 
                    list: orderbook.result, 
                    reversedCurrency: currency.reversed 
                }
            }
        })
        .catch(function (e) {
            res.status(500).json({'success': false, 'message': e.message})
        })
    })
    .then((orderbookResults) => {
        if(req.body.action == 'buy') {
            return FTXHelper.collectOnOrderBook(
                req.body.amount, 
                orderbookResults.list.asks,
                orderbookResults.reversedCurrency
            )
        } else if(req.body.action == 'sell') {
            return FTXHelper.collectOnOrderBook(
                req.body.amount, 
                orderbookResults.list.bids,
                orderbookResults.reversedCurrency
            )
        } else {
            res.status(500).json({'success': false, 'message': 'Action wrong or not defined' })
        }
    })
    .then((quoteResults) => {
        res.json({...quoteResults, currency: req.body.quote_currency})
    })
    .catch(function (e) {
        res.status(500).json({'success': false, 'message': e.message})
    })
})


/*
 * Some endpoints 
 * just for check;
 */

 /*
  * Basic account information
  */
app.get('/account', (req, res) => {
    FTXHelper.myAccountInfo().then((info) => {
        if(info.result && info.success === true) {
            res.json(info.result)
        } else {
            res.json({'success': false})
        }
    })
    .catch(function (e) {
        res.status(500, {'success': false})
    })
})

 /*
  * All market names and some info
  */
app.get('/market', (req, res) => {
    FTXHelper.getMarketName().then((info) => {
        if(info.result && info.success === true) {
            res.json(info.result)
        } else {
            res.json({'success': false})
        }
    })
    .catch(function (e) {
        res.status(500, {'success': false})
    })
})

/*
 * Basic test to check collection process
 */
app.get('/costcalc', (req, res) => {
    let asks = Object.assign({}, [
        [ 100.25, 20.25 ],
        [ 110.5, 30.5 ],
        [ 120.3, 60.3 ],
    ])

    let cost = FTXHelper.collectOnOrderBook(30, asks)
    console.log('LAST COST : ', cost)
    res.json({asks, cost})
})

app.listen(port, () => {
  console.log(`Example app listening at ${config.serviceAddress}:${port}`)
})