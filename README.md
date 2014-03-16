# I Need A Playlist

Generate playlists based on other playlists

## External Dependencies


Running your own copy relies on [Neo4j](http://neo4j.com).

**OSX**

    brew install libspotify

## Running

Make sure to install all of the dependencies

    npm install

After that, copy `config.example.js` to `config.js`. Update
`config.js` with options relative to your environment.

## Configuration

These are the configuration options that you can use

    {
        database: {
            url: 'url to neo4j'
        }
    }
