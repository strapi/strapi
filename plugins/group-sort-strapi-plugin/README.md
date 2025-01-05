# Group-arrange-strapi-plugin

Plugin allows to group content by existing fields and order items within groups. It might be useful for making image galleries, organizing articles, or managing product listings.

There are three types of arrangement supported:
- Simple 1-dimensional drag-and-drop arrangement
- Arrangement based on react-grid-layout to allow placing and resizing items on 2d grid
- Arrangement in separate rows that allow to have multiple rows with variable amount of items

# Installation

Execute the following `npm` command in command prompt:
```
npm install group-arrange-strapi-plugin
```
Or for yarn

```
yarn add group-arrange-strapi-plugin
```

# Description
This section explain how plugin works.
## Welcome page
First page that is open when clicking plugin button. It contains some instructions on how to use the plugin. When collection type is chosen in the left menu, it will open list of available groups under that collection type.
![Welcome page screenshot](https://raw.githubusercontent.com/giollord/group-sort-strapi-plugin/develop/plugins/group-sort-strapi-plugin/readmeAssets/welcome-page.png)

## Creating field
First need to create order field of one of three types:
- Order (numeric field, for simple drag-and drop arrangement of one-dimensional list)
- Order 2D (json field `{x,y,w,h}`, for tiled arrangement with variable tile size)
- Multiline order (json field `{row,column}`, for arranging items in rows with different amount of items per row)

Created field will hold information about configured item position. There could be multiple fields of same type, but with different configuration for columns count or grouping by field.

Different field types have slightly different settings.
- Columns - amount of columns. Mostly used for order 2d, for order 1d it's just affect admin panel visuals
- Order 2d direction - default direction in which items will be "falling" to during editing
- Grouping field - select field that will be used for grouping for this column. So, if there is field `city` and we have field `order` that is configured to gooup by field `city`, and we have items `Item 1 (Paris)`, `Item 2 (Berlin)`, `Item 3 (Paris)`, `Item 4 (Paris)`, then item 1, 3 and 4 will have values of `order` field 0, 1 and 2, while item 2 will have `order` value 0.

![Creating field](https://raw.githubusercontent.com/giollord/group-sort-strapi-plugin/develop/plugins/group-sort-strapi-plugin/readmeAssets/create-content-type.gif)

## Group choice
This is second page of the plugin where user can select group to edit ordering within. List of groups is taken by looking at **all the items** within chosen collection type. Parentheses display field that is used to group by. When group is selected, user is navigated to the next page to edit the order.
![Group choice](https://raw.githubusercontent.com/giollord/group-sort-strapi-plugin/develop/plugins/group-sort-strapi-plugin/readmeAssets/choose-group.png)

## View configuration
Settings on the top are user-specific and are only saved in localSettings. These fields control how to display items - what field should be image, what should be title and subtitle. These fields are optional and cna be left or set to blank value.

![View configuration](https://raw.githubusercontent.com/giollord/group-sort-strapi-plugin/develop/plugins/group-sort-strapi-plugin/readmeAssets/view-configuration.gif)

## Simple drag-and-drop ordering
This view is used to order items by drag-and-drop.

> Do not forget to **Save** changes

![Drag-and-drop ordering](https://raw.githubusercontent.com/giollord/group-sort-strapi-plugin/develop/plugins/group-sort-strapi-plugin/readmeAssets/order-1d.gif)

## Two-dimensional arrangement
Allows to arrange items on 2d grid and to set size to items as well. Settings on the top are user-specific and are only saved in localSettings, except for `Direction` - this one is taken from content type field configuration every time user enters the page.

> Do not forget to **Save** changes

![Order 2d](https://raw.githubusercontent.com/giollord/group-sort-strapi-plugin/develop/plugins/group-sort-strapi-plugin/readmeAssets/order-2d.gif)

## Multiline arrangement
Allows to create new lines and drag-and drop items there. Lines can be reordered or deleted as well using respective buttons. If row is deleted, items return back to **Unsorted items**. On top panel it's possible to choose displayed columns count for unsorted items, as well as position (top/bottom) of unsorted items list.

> Do not forget to **Save** changes

![Multiline order](https://raw.githubusercontent.com/giollord/group-sort-strapi-plugin/develop/plugins/group-sort-strapi-plugin/readmeAssets/order-multiline.gif)

## Global settings
There is currently just one global setting implemented:
- Always show type in list (True/False) - controls display of parentheses with field name in left menu in main plugin window. If enabled, parentheses will always will be displayed. If disabled, parentheses will be only displayed when there are multiple groups related to different fields with same name.

![Settings screenshot](https://raw.githubusercontent.com/giollord/group-sort-strapi-plugin/develop/plugins/group-sort-strapi-plugin/readmeAssets/global-settings.png)

## API response
Here is an example of response for `GET http://localhost:1337/api/addresses/jqnaatceu6xdub1dnexdzk43`. Field `categoryOrder` is order 1d, `location` is order 2d and `orderMultiline` is multiline order field.
```json
{
	"data": {
		"id": 15,
		"documentId": "jqnaatceu6xdub1dnexdzk43",
		"postal_code": "FR",
		"city": "Marseille",
		"json": null,
		"slug": null,
		"createdAt": "2024-12-26T20:03:48.667Z",
		"updatedAt": "2024-12-29T11:22:14.366Z",
		"publishedAt": "2024-12-29T11:22:14.362Z",
		"location": {
			"x": 0,
			"y": 0,
			"w": 2,
			"h": 3
		},
		"categoryOrder": 2,
		"orderMultiline": {
			"row": 2,
			"column": 1
		}
	},
	"meta": {}
}
```

# TODOs
- [x] Installable version of plugin
- [ ] Batch items update instead of sending API request per item in group

# Contribution
Please feel free to send your PRs if you'd like to fix/add/improve something!