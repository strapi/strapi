# Integrations

Strapi generates an API for you to access your content. But how can you connect a React, Ruby, Gatsby application to it?
It is important to know what is an API.

## What is an API?

API is the acronym for Application Programming Interface, which is a software intermediary that allows two applications to talk to each other.
In case you want to connect a React application with Strapi, we say that React is the client and Strapi the system. Indeed, React will communicate to Strapi, by making HTTP requests. Strapi will then give a response back to your client.

If your Strapi application contains restaurants and you want to list them in your React application, all you need to do is to make an HTTP request to Strapi which will take care to give you a response containing your restaurants.

The [API Endpoints](../content-api/api-endpoints.html#api-endpoints) documentation will give you all the keys in hand to interact with your Strapi API.

## Get started

Today, any programming language has an HTTP client allowing you to execute requests to an API and therefore interact with it. Javascript has [Axios](https://github.com/axios/axios), [Fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API), Ruby has [Faraday](https://github.com/lostisland/faraday), [HTTParty](https://github.com/jnunemaker/httparty), Python has [Requests](https://requests.readthedocs.io/en/master/) etc...

Integrate Strapi with a multitude of frameworks, frontend or backend programming languages just below.

<IntegrationLinks>
</IntegrationLinks>
