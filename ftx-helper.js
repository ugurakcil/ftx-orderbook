const config = require('./config.json')
const FTXRest = require('./ftx-rest')
const _ = require('lodash')
const Decimal = require('decimal.js')

const ftx = new FTXRest({
    key: config.key,
    secret: config.secret,
    subaccount: config.subaccount
})

class FTXHelper {
  myAccountInfo() {
    return ftx.request({
        method: 'GET',
        path: '/account'
    })
  }

  getOrderBook(base, quote) {
    return ftx.request({
        method: 'GET',
        path: `/markets/${base}/${quote}/orderbook`,
        data: {depth:100}
    })
  }

  getMarketName() {
    return ftx.request({
        method: 'GET',
        path: '/markets'
    })
  }

  /* 
   * The existence of the currency pair requested 
   * by the user is checked by listing the FTX market names.
   * 
   * TODO : Needs to cache or db
   */
  checkCurrency(baseCurrency, quoteCurrency) {
    let currencyIndex, currencyReverseIndex

    return this.getMarketName()
    .then((markets) => {
        return markets.result
    })
    .then((marketResults) => {
        currencyIndex = _.findIndex(marketResults, function(o) { 
            return o.baseCurrency == baseCurrency 
                && o.quoteCurrency == quoteCurrency 
                && o.type == 'spot' 
        })

        if(currencyIndex < 0) {
            currencyReverseIndex = _.findIndex(marketResults, function(o) { 
                return o.baseCurrency == quoteCurrency 
                    && o.quoteCurrency == baseCurrency 
                    && o.type == 'spot' 
            })
        }

        return { currencyIndex, currencyReverseIndex }
    })
    .then((indexes) => {
        if(indexes.currencyIndex > 0) {
            return {
                base: baseCurrency,
                quote: quoteCurrency,
                reversed: false
            }
        } else if(indexes.currencyReverseIndex > 0) {
            return {
                base: quoteCurrency,
                quote: baseCurrency,
                reversed: true
            }
        } else {
            return false
        }
    })
  }

  /*
   * All bids and asks quantities in the market are listed. 
   * The amount requested by the user is collected 
   * piece by piece at the most affordable prices.
   * TODO : Create "not enough market capacity" error message or request loop
   */
  collectOnOrderBook(exactAmount, list, reversedCurrency = false) {
    let amount = new Decimal(exactAmount)
    let fill = new Decimal(0)
    let cost = new Decimal(0)

    /*
     * The first index of the object coming through the API is the price, 
     * the second index is the size. 
     * For reverse operation, it is necessary to define them in reverse.
     */
    let priceNum = 0
    let sizeNum = 1

    if(reversedCurrency) {
        priceNum = 1
        sizeNum = 0
    }

    Object.values(list).forEach(line => {
        if(line[sizeNum] < amount) {
            fill = fill.plus(line[sizeNum])
            amount = amount.minus(line[sizeNum])
            cost = cost.plus((new Decimal(line[sizeNum]).times(line[priceNum])))
        } else {
            fill = fill.plus(amount)
            cost = cost.plus(amount.times(line[priceNum]))
            amount = new Decimal(0)
        }
    })

    return {
        total: cost,
        price: cost.dividedBy(exactAmount),
        filled: fill.dividedBy(exactAmount).times(100) + '%'
    }
  }
}

module.exports = new FTXHelper