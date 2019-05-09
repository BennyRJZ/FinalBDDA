## Bases De Datos Avanzadas.
## Ejercicios de Consulta en MongoDB.


* Antes de realizar nuestras consultas es necesario reformatear el JSON con el archivo `ReformateoYelp.js` (incluido en este repositorio) que facilita la lectura de coordenadas.

* Importamos el Dataset de Yelp (tips & businesses) obtenido desde Kaggle `https://www.kaggle.com/yelp-dataset/yelp-dataset`

```
mongoimport --collection businesses --file yelp_academic_dataset_business_formatted.json --db yelp
mongoimport --collection tips --file yelp_academic_dataset_tip.json --db yelp
```

Para realizar las consultas planteadas en el ejercicio, primero ingresamos a MongoDB, seleccionamos la base de datos y las colecciones donde realizaremos las consultas. 

```
mongo
```
```
use yelp;
```

1. Determine el número total de negocios registrados en el dataset, localizados en la ciudad de
Toronto.
* Resultados usando una consulta básica:
```js
db.businesses.find({city:"Toronto"}).count()
18906
```
* Usando `{$regex}`:
```js
db.businesses.find({city:{$regex: ".*Toronto.*"}}).count()
18917
```

2.  ¿Cuántos de esos negocios corresponden a restaurantes?
```js
db.businesses.find({city:{$regex: ".*Toronto.*"},categories:{$regex: ".*Restaurants.*"}}).count()
7966
```
3. Notará que el dataset incluye un campo indicando si el negocio está abierto o no (is_open).
Determine el número de restaurantes que están registrados como cerrados en la ciudad de
Toronto.
```js
db.businesses.find({city:{$regex : ".*Toronto.*"}, categories:{$regex : ".*Restaurants.*"} is_open:1}).count()
5255

```
4.  Usando Google maps u otra herramienta de geolocalización, determine coordenadas para la
Universidad de Toronto, Campus St. George. Determine el número de restaurantes en un radio
de 2 km con referencia a las coordenadas que obtuvo anteriormente.
*   Busqueda en un sitio de Coordenadas antes de agregar `*"Restaurants"*`
```js
db.businesses.find({location: { $geoWithin: {$centerSphere: [[-79.390331772,43.656997372],2/6378.1]}}}).count()
7151
```
*   Busqueda en Google antes de agregar `*"Restaurants"*`
```js
db.businesses.find({location: { $geoWithin: {$centerSphere: [[-79.3908603,43.6580313],2/6378.1]}}}).count()
7165

```
*   Usamos las coordenadas de Google debido a que nos regresó un mayor número de resultados.
*   Agregando `{$regex : ".*Restaurants.*"}`
```js
db.businesses.find({location: { $geoWithin: {$centerSphere: [[-79.3908603,43.6580313],2/6378.1]}},categories:{$regex : ".*Restaurants.*"}}).count() 
3013
```
5.  Usando la información de “stars”, agrupe y determine el número de restaurantes con
`[1, 2), [2, 3), [3, 4), [4, 5] `estrellas en todo Toronto.
*   Antes de agregar "*Restaurants*", tuvimos dificultades, ya que se tuvo que usar `aggregate.()` en lugar de `find.()`
```js
db.businesses.aggregate( [ { $bucket: { groupBy : "$stars", boundaries: [0,1,2,3,4,5], default: "5" } } ] )
```
*   Resultado completo:
```js
db.businesses.aggregate([{$match:{categories:{$regex : ".*Restaurants.*"},city:{$regex : ".*Toronto.*"}}},{$bucket: {groupBy: "$stars", boundaries: [0,1,2,3,4,5], default: "5"}}])
{ "_id" : 1, "count" : 166 }
{ "_id" : 2, "count" : 1201 }
{ "_id" : 3, "count" : 3710 }
{ "_id" : 4, "count" : 2733 }
{ "_id" : 5, "count" : 156 }
```
6.  Muestre los restaurantes “top 5” (en base al número de estrellas) que sirven hamburguesas, al
que puedo ir un jueves a las 16:00, en un radio de 3 km, con referencia a la Universidad de
Toronto, Campus St. George.
*   Antes de añadir {hours.Thursday}
```js
db.businesses.find({location: { $geoWithin: {$centerSphere: [[-79.3908603,43.6580313],3/6378.1]}},categories:{$regex : ".*Burgers.*"}  }).sort({stars:-1}).limit(5)
```
*   Ya con hours.Thursday añadido pero no compilando en todas las terminales de *MongoDB*
```js
db.businesses.find({
    location: { $geoWithin: {$centerSphere: [[-79.3908603,43.6580313],3/6378.1]}},
    categories: {$regex : ".*Burgers.*"},
    hours.Thursday   : { $regex : /^([0][0-9]|[1][0-6]).-([1][7-9]|[2][0-3])./ }
}).sort({stars:-1}).limit(5)
```
*   Corrección el la escritura de la expresión regular:
```js
db.businesses.find({
    is_open            : 1,
    location           : { $geoWithin: {$centerSphere: [[-79.3908603,43.6580313],3/6378.1]  } },
    categories         : { $regex : ".*Burgers.*"},
    "hours.Thursday"   : { $regex : /^([0][0-9]|[1][0-6]).*-([1][7-9]|[2][0-3]).*/ },
}).sort({stars:-1}).limit(5)
```
7.  Liste 20 lugares (si existen) donde puedo comer “burritos” en la ciudad de Toronto.
*   Primera consulta sin utilizar la colección tips. No arroja resultados con coincidencias en el nombre o la categoria con la palabra `("burritos")`
```js
db.businesses.find( { $text: { $search: "burritos" } } ).count()
```
*   Segunda consulta, usando la colección Tips.
1.  Creamos un indice dentro de la colección tips `db.tips.createIndex()`
```js
db.tips.aggregate([
    {
        $match:{
            $and:[{ $text: { $search: "burritos" }}]
        }
    },
    {
        $lookup:{
            from: "businesses",       
            localField: "business_id",   
            foreignField: "business_id", 
            as: "business_info"       
        }
    },
    {   $unwind:"$business_info" },
    { $limit: 20 },
    {   
        $project:{
            _id : 1,
            businessName : "$business_info.name"
        } 
    }
])
```
*   Tercera consulta mostrando todos los Restaurantes que venden `"burritos"` y se encuentran en Toronto. No tarda tanto en realizar la consulta y muestra correctamente los resultados, sin embargo no funciona con `.prettier()` ya que deja de mostrar los elementos completos.  
```js
db.tips.aggregate([
    {
        $match:{
            $and:[{ $text: { $search: "burritos" }}]
        }
    },
    {
        $lookup:{
            from: "businesses",
            localField: "business_id",   
            foreignField: "business_id", 
            as: "business_info"       
        }
    },
    {
        $addFields: {
            "business_info": {
                $arrayElemAt: [
                    {   
                        $filter: {
                            "input": "$business_info",
                            "as": "binfo",
                            "cond": {
                                $eq: [ "$$binfo.city", "Toronto" ]
                            }
                        }
                    }, 0
                ]
            }
        }
    },
    { $limit: 20 }
])
```
<!-- *   Segunda consulta ya usando la tabla Tips
8.  Selecione un restaurante con al menos 4.5 estrellas en la ciudad de Toronto. Determine el
nombre de uno o mas usuarios que hayan hecho una reseña con una calificación > 4 y que hayan
sido considerados usuarios “elite” en al menos un año.

```

``` -->

##  Equipo:
1.  Benny Ruiz.
2.  Jesús Librado.
3.  Luis Luna.




