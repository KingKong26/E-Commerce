var db=require('../config/connection')
var collection=require('../config/collections');
const collections = require('../config/collections');
const { response } = require('express');
var ObjectId=require('mongodb').ObjectID

module.exports={
    addProduct:(product,callb)=>{
        product.Price=parseInt(product.Price)
        db.get().collection('product').insertOne(product).then((data)=>{
            callb(data.ops[0]._id);
        }) 
    },

    getAllProducts:()=>{
        return new Promise(async(resolve,reject)=>{
            let products=await db.get().collection(collections.PRODUCT_COLLECTION).find().toArray()
            resolve(products)
        })
    },
    deleteProduct:(productId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTION).removeOne({_id:ObjectId(productId)}).then(()=>{
                resolve(response)
                console.log(response);
            })
        })
    },
    getProductDetails:(productId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTION).findOne({_id:ObjectId(productId)}).then((product)=>{
                console.log(product)
                resolve(product);
            })
        })
    },
    updateProduct:(productId,productDetails)=>{{
        productDetails.Price=parseInt(productDetails.Price)
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTION).updateOne({_id:ObjectId(productId)},{
                $set:
                {Name:productDetails.Name,
                 Description:productDetails.Description,
                 Price:productDetails.Price,
                 Category:productDetails.Category,
                }
            }).then((response)=>{
                resolve()
            })
        })
    }}
}