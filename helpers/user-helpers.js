var db = require('../config/connection')
var collection = require('../config/collections');
const bcrypt = require('bcrypt');
const collections = require('../config/collections');
const Razorpay=require('razorpay');
const {
    response
} = require('express');
var ObjectId = require('mongodb').ObjectID;
const {
    ObjectID
} = require('mongodb');
var instance = new Razorpay({
    key_id: 'rzp_test_kqiKaRtFdItrug',
    key_secret: 'G3l7Cv1FyBjkg54jLFf2Iff2',
  });

module.exports = {
    doSignup: (userData) => {
        return new Promise(async (resolve, reject) => {
            userData.Password = await bcrypt.hash(userData.Password, 10)
            db.get().collection(collection.USER_COLLECTION).insertOne(userData).then((data) => {
                resolve(data.ops[0])
            })
        })
    },
    doLogin: (userData) => {
        return new Promise(async (resolve, reject) => {
            let loginStatus = false;
            let user = await db.get().collection(collection.USER_COLLECTION).findOne({
                Email: userData.Email
            })
            if (user) {
                bcrypt.compare(userData.Password, user.Password).then((status) => {
                    if (status) {
                        console.log('true');
                        response.user = user;
                        response.status = true;
                        resolve(response)
                    } else {
                        console.log('false');
                        resolve({
                            status: false
                        });
                    }
                })
            } else {
                
                resolve({
                    status: false
                });
            }
        })
    },
    addToCart: (productId, userId) => {
        let productObj = {
            item: ObjectId(productId),
            quantity: 1
        }
        return new Promise(async (resolve, reject) => {
            let userCart = await db.get().collection(collection.CART_COLLECTION).findOne({
                user: ObjectId(userId)
            })
            if (userCart) {
                let productExist = userCart.products.findIndex(product => product.item == productId)
                if (productExist != -1) {
                    db.get().collection(collection.CART_COLLECTION)
                        .updateOne({
                            user: ObjectId(userId),
                            'products.item': ObjectId(productId)
                        }, {
                            $inc: {
                                'products.$.quantity': 1
                            }
                        }).then(() => {
                            resolve()
                        })
                } else {
                    db.get().collection(collection.CART_COLLECTION).updateOne({
                        user: ObjectId(userId)
                    }, {
                        $push: {
                            products: productObj
                        }
                    }).then((response) => {
                        resolve()
                    })
                }
            } else {
                let cartObj = {
                    user: ObjectId(userId),
                    products: [productObj]
                }
                db.get().collection(collection.CART_COLLECTION).insertOne(cartObj).then((response) => {
                    resolve()
                })
            }
        })
    },
    getCartProducts: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cartItems = await db.get().collection(collection.CART_COLLECTION).aggregate([{
                    $match: {
                        user: ObjectId(userId)
                    }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        _id: 1,
                        item: 1,
                        quantity: 1,
                        product: {
                            $arrayElemAt: ['$product', 0]
                        }
                    }
                }

            ]).toArray()

            resolve(cartItems)
        })
    },
    getCartCount: (userId) => {
        return new Promise(async (resolve, reject) => {
            let count = 0;
            let cart = await db.get().collection(collection.CART_COLLECTION).findOne({
                user: ObjectId(userId)
            })
            if (cart) {
                count = cart.products.length
            }
            resolve(count)

        })
    },
    changeProductQuantity: (details) => {
        details.count = parseInt(details.count);
        details.quantity = parseInt(details.quantity);

        return new Promise((resolve, reject) => {
            if(details.count==-1 && details.quantity==1){
            db.get().collection(collection.CART_COLLECTION)
                .updateOne({ _id: ObjectId(details.cart) }, {
                    $pull: {products:{item:ObjectId(details.product)}}
                }).then((response) => {
                    resolve({removeProduct:true});
                })
            }else{
                db.get().collection(collection.CART_COLLECTION)
                .updateOne({
                    _id: ObjectId(details.cart),
                    'products.item': ObjectId(details.product)
                }, {
                    $inc: {
                        'products.$.quantity': details.count
                    }
                }).then((response) => {
                    
                    resolve({status:true})
                })
            }
        })
    },
    getTotalAmount:(userId)=>{
        return new Promise(async (resolve, reject) => {
            let total= await db.get().collection(collection.CART_COLLECTION).aggregate([{
                    $match: {
                        user: ObjectId(userId)
                    }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        _id: 1,
                        item: 1,
                        quantity: 1,
                        product: {
                            $arrayElemAt: ['$product', 0]
                        }
                    }
                },
                {
                    $group:{
                        _id:null,
                        total:{$sum:{$multiply:['$quantity','$product.Price']}}
                    }
                }
            ]).toArray()
            resolve(total[0].total)
        })
    },
    placeOrder:(order,products,total)=>{
        return new Promise((resolve,reject)=>{
            let status=order['payment-method']==='COD'?'placed':'pending'
            let orderObj={
                deliveryDetails:{
                    address:order.address,
                    mobile:order.mobile,
                    pincode:order.pincode
                },
                userId:ObjectId(order.userId),
                paymentMethod:order['payment-method'],
                products:products,
                totalAmount:total,
                status:status,
                date:new Date()
            }
            
            db.get().collection(collection.ORDER_COLLECTION).insertOne(orderObj).then((response)=>{
                db.get().collection(collection.CART_COLLECTION).removeOne({user:ObjectId(order.userId)})
                resolve(response.ops[0]._id)
              
            })
        })
        
    },
    getCartProductList:(userId)=>{
        return new Promise(async (resolve,reject)=>{
            let cart= await db.get().collection(collection.CART_COLLECTION).findOne({user:ObjectId(userId)})
            resolve(cart.products)
        })
    },
    getUserOrders:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            
            let orders=await db.get().collection(collection.ORDER_COLLECTION).find({userId:ObjectId(userId)}).toArray()
            
            resolve(orders)
        })
    },
    getOrderProducts: (orderId) => {
        return new Promise(async (resolve, reject) => {
            let orderItems = await db.get().collection(collection.ORDER_COLLECTION).aggregate([{
                    $match: {
                        _id: ObjectId(orderId)
                    }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        _id: 1,
                        item: 1,
                        quantity: 1,
                        product: {
                            $arrayElemAt: ['$product', 0]
                        }
                    }
                }

            ]).toArray()
            
            resolve(orderItems)
        })
    },
    generateRazorpay:(orderId,total)=>{
        return new Promise((resolve,reject)=>{
            var options = {
                amount: total*100,  // amount in the smallest currency unit
                currency: "INR",
                receipt:""+orderId
              };
              instance.orders.create(options, function(err, order) {
                resolve(order)
              });
        })
    },
    verifyPayment:(details)=>{
        return new Promise((resolve,reject)=>{
            const crypto = require('crypto');
            let hmac = crypto.createHmac('sha256', 'G3l7Cv1FyBjkg54jLFf2Iff2');

            hmac.update(details['payment[razorpay_order_id]']+'|'+ details['payment[razorpay_payment_id]']);
            hmac=hmac.digest('hex')
            if(hmac==details['payment[razorpay_signature]']){
                resolve()
            }else{
                reject()
            }
        })
    },
    changePaymentStatus:(orderId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.ORDER_COLLECTION).updateOne({_id:ObjectId(orderId)},
            {
                $set:{
                    status:'Placed'
                }
            }).then(()=>{
                resolve()
            })
        })
    }
}