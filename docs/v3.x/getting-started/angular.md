# Getting Started with Angular

This integration guide is following the [Getting started guide](../getting-started/quick-start.html). We assume that you have completed [Step 8](../getting-started/quick-start.html#_8-consume-the-content-type-s-api) and therefore can consume the API by browsing this [url](http://localhost:1337/restaurants).

If you haven't gone through the getting started guide, the way you request a Strapi API with [Angular](https://angular.io) remains the same except that you will not fetch the same content.

### Create a Angular app

Create a basic Angular application using [angular CLI](https://angular.io/guide/setup-locall).

```bash
npx -p @angular/cli ng new angular-app
```

### Use an HTTP client

Many HTTP clients are available but in this documentation we'll use [Axios](https://github.com/axios/axios) and [Fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API).

:::: tabs

::: tab axios

```bash
yarn add axios
```

:::

::: tab fetch

No installation needed

:::

::::

### GET Request your collection type

Execute a `GET` request on the `restaurant` Collection Type in order to fetch all your restaurants.

Be sure that you activated the `find` permission for the `restaurant` Collection Type.

:::: tabs

::: tab axios

_Request_

```js
import axios from 'axios';

axios.get('http://localhost:1337/restaurants').then(response => {
  console.log(response);
});
```

:::

::: tab fetch

_Request_

```js
fetch('http://localhost:1337/restaurants', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
  },
})
  .then(response => response.json())
  .then(data => console.log(data));
```

:::

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

::::

### Example

:::: tabs

::: tab axios

`./src/app/app.component.ts`

```js
import { Component, OnInit } from '@angular/core';
import axios from 'axios';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
  title = 'angular-app';
  restaurants = [];
  error = null;

  async ngOnInit() {
    try {
      const response = await axios.get('http://localhost:1337/restaurants');
      this.restaurants = response.data;
    } catch (error) {
      this.error = error;
    }
  }
}
```

:::

::: tab fetch

`./src/app/app.component.ts`

```js
import { Component, OnInit } from '@angular/core';

const parseJSON = resp => (resp.json ? resp.json() : resp);

// Checks if a network request came back fine, and throws an error if not
const checkStatus = resp => {
  if (resp.status >= 200 && resp.status < 300) {
    return resp;
  }
  return parseJSON(resp).then(resp => {
    throw resp;
  });
};
const headers = {
  'Content-Type': 'application/json',
};

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
  title = 'angular-app';
  restaurants = [];
  error = null;

  async ngOnInit() {
    try {
      const restaurants = await fetch('http://localhost:1337/restaurants', {
        method: 'GET',
        headers: headers,
      })
        .then(checkStatus)
        .then(parseJSON);
      this.restaurants = restaurants;
    } catch (error) {
      this.error = error;
    }
  }
}
```

:::

`./src/app/app.component.html`

```html
<div *ngIf="error">
  {{ error }}
</div>

<ul>
  <li *ngFor="let restaurant of restaurants">{{ restaurant.name }}</li>
</ul>
```

::::

### POST Request your collection type

Execute a `POST` request on the `restaurant` Collection Type in order to create a restaurant.

Be sure that you activated the `create` permission for the `restaurant` Collection Type and the `find` permission fot the `category` Collection type.

In this example a `japanese` category has been created which has the id: 3.

:::: tabs

::: tab axios

_Request_

```js
import axios from 'axios';

axios
  .post('http://localhost:1337/restaurants', {
    name: 'Dolemon Sushi',
    description: 'Unmissable Japanese Sushi restaurant. The cheese and salmon makis are delicious',
    categories: [3],
  })
  .then(response => {
    console.log(response);
  });
```

:::

::: tab fetch

_Request_

```js
fetch('http://localhost:1337/restaurants', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'Dolemon Sushi',
    description: 'Unmissable Japanese Sushi restaurant. The cheese and salmon makis are delicious',
    categories: [3],
  }),
})
  .then(response => response.json())
  .then(data => console.log(data));
```

:::

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

::::

### Example

:::: tabs

`./src/app.module.ts`

```js
import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { AppComponent } from './app.component';

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, FormsModule, ReactiveFormsModule],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
```

::: tab axios

`./src/app/app.component.ts`

```js
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormArray, FormControl } from '@angular/forms';
import axios from 'axios'

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})

export class AppComponent implements OnInit {
  modifiedData;

  constructor(
    private formBuilder: FormBuilder,
  ) {
    this.modifiedData = this.formBuilder.group({
      name: '',
      description: '',
      categories: new FormArray([]),
    });
  }

  onCheckChange(event) {
    const formArray: FormArray = this.modifiedData.get('categories') as FormArray;

    if (event.target.checked) {
      formArray.push(new FormControl(event.target.value));
    }
    else {
      let i: number = 0;

      formArray.controls.forEach((ctrl: FormControl) => {
        if (ctrl.value == event.target.value) {
          formArray.removeAt(i);
          return;
        }
        i++;
      });
    }
  }

  title = 'angular-app';
  allCategories = [];
  error = null;

  async ngOnInit() {
    try {
      const response = await axios.get('http://localhost:1337/categories');
      this.allCategories = response.data
    } catch (error) {
      this.error = error
    }
    console.log(this.allCategories);
  }

  async onSubmit(restaurantData) {
    try {
      const response = await axios.post(
        'http://localhost:1337/restaurants',
        restaurantData
      );
      console.log(response);
    } catch (error) {
      this.error = error;
    }
    this.modifiedData.reset();
  }

}
```

:::

::: tab fetch

`./src/app/app.component.ts`

```js
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormArray, FormControl } from '@angular/forms';

const parseJSON = resp => (resp.json ? resp.json() : resp);

// Checks if a network request came back fine, and throws an error if not
const checkStatus = resp => {
  if (resp.status >= 200 && resp.status < 300) {
    return resp;
  }
  return parseJSON(resp).then(resp => {
    throw resp;
  });
};
const headers = {
  'Content-Type': 'application/json',
};

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})

export class AppComponent implements OnInit {
  modifiedData;

  constructor(
    private formBuilder: FormBuilder,
  ) {
    this.modifiedData = this.formBuilder.group({
      name: '',
      description: '',
      categories: new FormArray([]),
    });
  }

  onCheckChange(event) {
    const formArray: FormArray = this.modifiedData.get('categories') as FormArray;

    if (event.target.checked) {
      formArray.push(new FormControl(event.target.value));
    }
    else {
      let i: number = 0;

      formArray.controls.forEach((ctrl: FormControl) => {
        if (ctrl.value == event.target.value) {
          formArray.removeAt(i);
          return;
        }
        i++;
      });
    }
  }

  title = 'angular-app';
  allCategories = [];
  error = null;

  async ngOnInit() {
    try {
      const allCategories = await fetch('http://localhost:1337/categories', {
        method: 'GET',
        headers: headers,
      })
        .then(checkStatus)
        .then(parseJSON);
      this.allCategories = allCategories;
    } catch (error) {
      this.error = error
    }
    console.log(this.allCategories);
  }

  async onSubmit(restaurantData) {
    try {
      await fetch('http://localhost:1337/restaurants', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(restaurantData),
      })
        .then(checkStatus)
        .then(parseJSON);
    } catch (error) {
      this.error = error
    }
    this.modifiedData.reset();
  }
}
```

:::

`./src/app/app.component.html`

```html
<div *ngIf="error">
  {{ error }}
</div>

<form [formGroup]="modifiedData" (ngSubmit)="onSubmit(modifiedData.value)">
  <div>
    <label for="name">
      Name
    </label>
    <input id="name" type="text" formControlName="name" />
  </div>

  <div>
    <label for="address">
      Description
    </label>
    <input id="description" type="text" formControlName="description" />
  </div>

  <div *ngIf="allCategories">
    <br />
    Select categories
    <div *ngFor="let category of allCategories">
      <label>{{ category.name }}</label>
      <input [value]="category.id" type="checkbox" (change)="onCheckChange($event)" />
    </div>
  </div>

  <button class="button" type="submit">Create</button>
</form>
```

::::

### PUT Request your collection type

Execute a `PUT` request on the `restaurant` Collection Type in order to update the category of a restaurant.

Be sure that you activated the `put` permission for the `restaurant` Collection Type.

:::: tabs

We consider that the id of your restaurant is `2`.
and the id of your category is `2`.

::: tab axios

_Request_

```js
import axios from 'axios';

axios
  .put('http://localhost:1337/restaurants/2', {
    categories: [2],
  })
  .then(response => {
    console.log(response);
  });
```

:::

::: tab fetch

_Request_

```js
fetch('http://localhost:1337/restaurants/2', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    categories: [2],
  }),
})
  .then(response => response.json())
  .then(data => {
    console.log(data);
  });
```

:::

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

::::

## Starter

- [Angular Blog starter](https://github.com/strapi/strapi-starter-angular-blog)

## Conclusion

Here is how to request your Collection Types in Strapi using Angular. When you create a Collection Type or a Single Type you will have a certain number of REST API endpoints available to interact with.
