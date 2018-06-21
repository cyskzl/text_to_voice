<?php
header("Content-type:text/html;charset=utf-8");

require_once 'AipSpeech.php';

require_once 'config.php';

if($_POST['txt']){

$client = new AipSpeech(APP_ID, API_KEY, SECRET_KEY);

$result = $client->synthesis(trim($_POST['txt']), 'zh', 1, array(
	'spd' => trim($_POST['spd']),
	'pit' => trim($_POST['pit']),
	'vol' => trim($_POST['vol']),
	'per' => trim($_POST['per'])
));

// 识别正确返回语音二进制 错误则返回json 参照下面错误码

//var_dump($result);
if(!is_array($result)){
	$wj='test.mp3';
$file = fopen($wj,"w");
fwrite($file,$result);
fclose($file);
}
?>
<audio src="<?php echo $wj?>?rd=<?php echo rand(100,9999)?>" controls="controls" autoplay>
Your browser does not support the audio element.
</audio>
<?php
}
?>

<form method="post" action="">
<h1>文字转语音</h1>
<p>语速<select name="spd">
<?php
if($_POST['spd']){
echo '<option value="'.$_POST['spd'].'" selected>'.$_POST['spd'];
}else{
echo '<option value="5" selected>5';
}
?>
	<option value="1">1
	<option value="2">2
	<option value="3">3
	<option value="5">5
	<option value="4">4
	<option value="6">6
	<option value="7">7
	<option value="8">8
	<option value="9">9

</select></p>
<p>音调<select name="pit">
<?php
if($_POST['pit']){
echo '<option value="'.$_POST['pit'].'" selected>'.$_POST['pit'];
}else{
echo '<option value="5" selected>5';
}
?>

	<option value="1">1
	<option value="2">2
	<option value="3">3
	<option value="4">4
	<option value="5">5
	<option value="6">6
	<option value="7">7
	<option value="8">8
	<option value="9">9

</select></p>
<p>音量<select name="vol">
<?php
if($_POST['vol']){
echo '<option value="'.$_POST['vol'].'" selected>'.$_POST['vol'];
}else{
echo '<option value="5" selected>5';
}
?>

	<option value="1">1
	<option value="2">2
	<option value="3">3
	<option value="4">4
	<option value="5">5
	<option value="6">6
	<option value="7">7
	<option value="8">8
	<option value="9">9
	<option value="10">10
	<option value="11">11
	<option value="12">12
	<option value="13">13
	<option value="14">14
	<option value="15">15

</select></p>
<p>发音人<select name="per">
<?php
if($_POST['per']){
	if($_POST['per']=='0'){
	$vals='普通女声';
	}elseif($_POST['per']=='1'){
	$vals='普通男声';
	}if($_POST['per']=='3'){
	$vals='情感男声';
	}if($_POST['per']=='4'){
	$vals='情感女声';
	}
echo '<option value="'.$_POST['per'].'" selected>'.$vals;
}else{
echo '<option value="0">普通女声';
}
?>
    <option value="0">普通女声
	<option value="1">普通男声
	<option value="3">情感男声
	<option value="4">情感女声
	
</select></p>
	输入文字：*文字长度不超过500字<br>
	
	<textarea name="txt" rows="30" cols="80"><?php echo $_POST['txt']?></textarea>
	<br>
	<input type="submit" value='文字转换成语音'>
</form>