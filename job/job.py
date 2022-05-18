from errno import errorcode
import requests
import mysql.connector
import os
import time

start = time.time()
try:
  cnx = mydb = mysql.connector.connect(
      host="localhost",
      user="root",
      password=os.getenv('TYPEORM_PASSWORD'),
      database="spotifyRemixDB",
      auth_plugin='mysql_native_password'
    )
except mysql.connector.Error as err:
  if err.errno == errorcode.ER_ACCESS_DENIED_ERROR:
    print("Something is wrong with your user name or password")
  elif err.errno == errorcode.ER_BAD_DB_ERROR:
    print("Database does not exist")
  else:
    print(err)

mycursor = cnx.cursor(dictionary=True, buffered=True)
mycursor.execute("SELECT DISTINCT(playlistId) FROM playlist;")

playlists = mycursor.fetchall()

for playlist in playlists:
  url = "http://stevefreeman.io/refresh/{playlistId}".format(playlistId=playlist['playlistId'])
  headers = { "Authorization": os.getenv('SPOTIFY_REMIX_API_KEY')}
  response = requests.post(url, headers=headers)
  if (response.status_code > 200):
    print('{statusCode} Failure during playlist refresh for {playlistId}'.format(statusCode=response.status_code, playlistId=playlist["playlistId"]))
    print(response.json())
