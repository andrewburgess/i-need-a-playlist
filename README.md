# I Need A Playlist

Generate playlists based on other playlists

## External Dependencies

**NOTE:** You must be running Linux or OSX

Running your own copy relies on [Neo4j](http://neo4j.com).

You will need to install [libspotify](https://developer.spotify.com/technologies/libspotify/)
development headers as well

**OSX**

    brew install libspotify

## Running

Make sure to install all of the dependencies

    npm install

After that, copy `config.example.js` to `config.js`. Update
`config.js` with options relative to your environment.

You will also need to get your [Spotify developer key](https://devaccount.spotify.com/my-account/keys/)
and copy it into the root directory. This also means you will need a Premium
Spotify account.

## Configuration

These are the configuration options that you can use

    {
        server: {
            url: 'url to neo4j'
        },
        spotify: {
            username: 'spotify username',
            password: 'spotify password'
        }
    }
