
$(document).ready(function(){
 var socket=io();
 socket.on('connect',function(socket){
    console.log('Connected to Server');
 });

 var ObjectID=$('#ObjectID').val();
 var carID=$('#carID').val();
 socket.emit('ObjectID',{
  carID: carID,
  userID: ObjectID
 });
 socket.on('disconnect',function(socket){
    console.log('Disconnected from Server');
 });
});
