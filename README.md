# Shotstack Domain API Demo

This project demonstrates how to use the Shotstack cloud [video editing API](https://shotstack.io) to create 
a video using property information sourced from the [Domain group](https://developer.domain.com.au/).

An HTML web form allows the user to search for a property using the Domain
Group's property API. Address and property information is added automatically,
and Luma matte transitions are used to create more engaging video effects. The
final video is created by the Shotstack API using images returned by the Domain
search.

View the live demo at: https://shotstack.io/demo/domain-real-estate-api/

The demo is built using Node JS and can be used with either Express Framework or deployed 
as a serverless projects using AWS Lambda and API Gateway.

### Requirements

- Node 8.10+
- Domain developer API key: https://developer.domain.com.au
- Shotstack API key: https://dashboard.shotstack.io/register

### Project Structure

The project is divided in to a two components:

#### Backend API

The backend API with an endpoint which searches the Domain API, prepares the edit and posts 
the data to the Shotstack API. A status endpoint is also available which can be polled to 
return the status of the video as it renders.

The backend API source code is in the _api_ directory.

#### Frontend Web Form & Player

The frontend is a simple HTML form that allows the user to enter a search term and basic 
options to create a video. The form uses jQuery to submit the data to the backend API and 
poll the status of the current render. There is also a video player that is loaded with 
the final rendered video when ready.

The front end API source code is in the _web_ directory.

### Installation

Install node module dependencies:

```bash
cd api
npm install
```

### Configuration

Copy the .env.dist file and rename it .env:

```
cp .env.dist .env
```

Replace the environment variables below with your
Domain and Shotstack API key (staging key):

```bash
DOMAIN_API_KEY=replace_with_your_domain_key
SHOTSTACK_API_KEY=replace_with_your_shotstack_key
```

### Run Locally

To start the API and serve the front end form (from the _api_ directory):

```bash
npm run start
```

The visit [http://localhost:3000](http://localhost:3000)


### Deploy Serverless Application (optional)

The project has been built as a serverless application using the Serverless Framework 
and AWS Lambda. To understand more about the Serverless Framework and how to set 
everything up consult the documentation: https://serverless.com/framework/docs/providers/aws/

To deploy to AWS Lambda (from the _api_ directory):

```bash
cd api
npm run serverless
```

Once the API is deployed set the `var apiEndpoint` variable in **web/app.js** to the returned
API Gateway URL.

Run the **web/index.html** file locally or use AWS S3 static hosting to serve the web page.
