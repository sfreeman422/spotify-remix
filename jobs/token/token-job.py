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
mycursor.execute("SELECT spotifyId, accessToken FROM user;")

users = mycursor.fetchall()

for user in users:
  print(user)
  url = "https://remix.lol/refresh?spotifyId={spotifyId}".format(spotifyId=user['spotifyId'])
  headers = { 'Authorization': 'Bearer {accessToken}'.format(accessToken=user['accessToken'])}
  response = requests.get(url, headers=headers)
  if (response.status_code > 200):
    print('{statusCode} Failure during user refresh for {userId}'.format(statusCode=response.status_code, userId=user["spotifyId"]))
    print(response.json())
