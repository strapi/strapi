# Getting Started with Python

This integration guide is following the [Getting started guide](../getting-started/quick-start.html). We assume that you have completed [Step 8](../getting-started/quick-start.html#_8-consume-the-content-type-s-api) and therefore can consume the API by browsing this [url](http://localhost:1337/restaurants).

If you haven't gone through the getting started guide, the way you request a Strapi API with [Python](https://www.python.org/) remains the same except that you will not fetch the same content.

### Create a Python file

Be sure to have Python installed on your computer.s

```bash
touch script.py
```

### Use an HTTP client

Many HTTP clients are available but in this documentation we'll use [Requests](https://github.com/psf/requests).

```bash
python -m pip install requests
```

### GET Request your collection type

Execute a `GET` request on the `restaurant` Collection Type in order to fetch all your restaurants.

Be sure that you activated the `find` permission for the `restaurant` Collection Type.

_Request_

```python
requests.get("http://localhost:1337/restaurants",
  headers={
    'Content-Type': 'application/json'
  })
```

_Response_

```json
[
  {
    "id": 1,
    "name": "Biscotte Restaurant",
    "description": "Welcome to Biscotte restaurant! Restaurant Biscotte offers a cuisine based on fresh, quality products, often local, organic when possible, and always produced by passionate producers.",
    "created_by": {
      "id": 1,
      "firstname": "Paul",
      "lastname": "Bocuse",
      "username": null
    },
    "updated_by": {
      "id": 1,
      "firstname": "Paul",
      "lastname": "Bocuse",
      "username": null
    },
    "created_at": "2020-07-31T11:37:16.964Z",
    "updated_at": "2020-07-31T11:37:16.975Z",
    "categories": [
      {
        "id": 1,
        "name": "French Food",
        "created_by": 1,
        "updated_by": 1,
        "created_at": "2020-07-31T11:36:23.164Z",
        "updated_at": "2020-07-31T11:36:23.172Z"
      }
    ]
  }
]
```

### Example

```python
import requests
import json

class Restaurant:
    def __init__(self):
        self.api_url = "http://localhost:1337"

    def all(self):
        r = requests.get(self.api_url + "/restaurants",
        headers={
          'Content-Type': 'application/json'
        })
        return r.json()

restaurant = Restaurant()
print(restaurant.all())
```

### POST Request your collection type

Execute a `POST` request on the `restaurant` Collection Type in order to create a restaurant.

Be sure that you activated the `create` permission for the `restaurant` Collection Type and the `find` permission for the `category` Collection type.

In this example a `japanese` category has been created which has the id: 3.

_Request_

```python
requests.post("http://localhost:1337/restaurants",
data=json_dumps({
    'name': 'Dolemon Sushi',
    'description': 'Unmissable Japanese Sushi restaurant. The cheese and salmon makis are delicious',
    'categories': [3],
  }),
  headers={
    'Content-Type': 'application/json'
  })
)
```

_Response_

```json
{
  "id": 2,
  "name": "Dolemon Sushi",
  "description": "Unmissable Japanese Sushi restaurant. The cheese and salmon makis are delicious",
  "created_by": null,
  "updated_by": null,
  "created_at": "2020-08-04T09:57:11.669Z",
  "updated_at": "2020-08-04T09:57:11.669Z",
  "categories": [
    {
      "id": 3,
      "name": "Japanese",
      "created_by": 1,
      "updated_by": 1,
      "created_at": "2020-07-31T11:36:23.164Z",
      "updated_at": "2020-07-31T11:36:23.172Z"
    }
  ]
}
```

### Example

```python
import requests
import json

class Restaurant:
    def __init__(self):
        self.api_url = "http://localhost:1337"

    def all(self):
        r = requests.get(self.api_url + "/restaurants")
        return r.json()

    def create(self, params):
        r = requests.post(self.api_url + "/restaurants",
        data=json.dumps({
            'name': params["name"],
            'description': params["description"],
            'categories': params["categories"]
        }),
        headers={
            'Content-Type': 'application/json'
        })

restaurant = Restaurant()
print(restaurant.create({
    'name': 'Dolemon Sushi',
    'description': 'Unmissable Japanese Sushi restaurant. The cheese and salmon makis are delicious',
    'categories': [3],
}))
```

### PUT Request your collection type

Execute a `PUT` request on the `restaurant` Collection Type in order to update the category of a restaurant.

Be sure that you activated the `put` permission for the `restaurant` Collection Type.

_Request_

```python
requests.put("http://localhost:1337/restaurants/2",
data=json_dumps({
  'categories': [2]
}),
headers={
'Content-Type': 'application/json'
})
```

_Response_

```json
{
  "id": 2,
  "name": "Dolemon Sushi",
  "description": "Unmissable Japanese Sushi restaurant. The cheese and salmon makis are delicious",
  "created_by": null,
  "updated_by": null,
  "created_at": "2020-08-04T10:21:30.219Z",
  "updated_at": "2020-08-04T10:21:30.219Z",
  "categories": [
    {
      "id": 2,
      "name": "Brunch",
      "created_by": 1,
      "updated_by": 1,
      "created_at": "2020-08-04T10:24:26.901Z",
      "updated_at": "2020-08-04T10:24:26.911Z"
    }
  ]
}
```

### Example

```python
import requests
import json

class Restaurant:
    def __init__(self):
        self.api_url = "http://localhost:1337"

    def all(self):
        r = requests.get(self.api_url + "/restaurants")
        return r.json()

    def create(self, params):
        r = requests.post(self.api_url + "/restaurants",
        data=json.dumps({
            'name': params["name"],
            'description': params["description"],
            'categories': params["categories"]
        }),
        headers={
        'Content-Type': 'application/json'
        })

    def update(self, id, params):
        r = requests.put(self.api_url + "/restaurants/" + str(id),
        data=json.dumps({
            'categories': params["categories"]
        }),
        headers={
        'Content-Type': 'application/json'
        })

restaurant = Restaurant()
print(restaurant.update(2, {
    'categories': [2]
}))
```

## Conclusion

Here is how to request your Collection Types in Strapi using Python. When you create a Collection Type or a Single Type you will have a certain number of REST API endpoints available to interact with.
