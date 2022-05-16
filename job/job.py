from errno import errorcode
import mysql.connector
import os
import time
import json
from urllib import request

print("Beginning refresh job...")
start = time.time()
try:
  print("Connecting to mysql DB...")
  cnx = mydb = mysql.connector.connect(
      host="localhost",
      user="root",
      password=os.getenv('TYPEORM_PASSWORD'),
      database="spotifyRemixDB"
    )
except mysql.connector.Error as err:
  if err.errno == errorcode.ER_ACCESS_DENIED_ERROR:
    print("Something is wrong with your user name or password")
  elif err.errno == errorcode.ER_BAD_DB_ERROR:
    print("Database does not exist")
  else:
    print(err)

print("Connected!")
mycursor = cnx.cursor(dictionary=True, buffered=True)

print('Retrieving distinct playlists...')
mycursor.execute("SELECT DISTINCT(playlistId) FROM playlist;")

playlists = mycursor.fetchall()
print(playlists)
print('Playlists retrieved!')

for playlist in playlists:
  url = "http://localhost:80/refresh/{playlistId}".format(playlistId=playlist['playlistId'])
  response = request.urlopen(url)
  data = json.loads(response.read())

print("Completed refresh job in {time} seconds!".format(time=time.time() - start))
