<?php
/**
 * 京东支付回调处理
 * 处理京东支付完成后的异步通知
 */

header('Content-Type: text/plain; charset=utf-8');

// 日志记录函数
function writeLog($message) {
    $logFile = dirname(__FILE__) . '/logs/jd_notify_' . date('Y-m-d') . '.log';
    $logDir = dirname($logFile);
    if (!is_dir($logDir)) {
        mkdir($logDir, 0755, true);
    }
    
    $timestamp = date('Y-m-d H:i:s');
    file_put_contents($logFile, "[$timestamp] $message\n", FILE_APPEND | LOCK_EX);
}

try {
    // 记录接收到的回调数据
    $callbackData = file_get_contents('php://input');
    writeLog("收到京东支付回调: " . $callbackData);
    
    // 解析回调参数
    parse_str($callbackData, $params);
    
    // 也尝试从 $_POST 获取数据
    if (empty($params)) {
        $params = $_POST;
    }
    
    writeLog("解析后的参数: " . json_encode($params));
    
    // 验证必要参数
    if (empty($params['tradeNum']) || empty($params['amount']) || empty($params['status'])) {
        writeLog("回调参数不完整");
        echo "FAIL";
        exit;
    }
    
    // 验证签名
    if (!verifySign($params)) {
        writeLog("签名验证失败");
        echo "FAIL";
        exit;
    }
    
    // 获取订单信息
    $tradeNo = $params['tradeNum'];
    $amount = $params['amount'];
    $status = $params['status'];
    $jdTradeNo = $params['jdTradeNum'] ?? '';
    
    // 更新订单状态
    $updateResult = updateOrderStatus($tradeNo, $status, $jdTradeNo, $amount);
    
    if ($updateResult) {
        writeLog("订单状态更新成功: $tradeNo => $status");
        
        // 如果支付成功，可以触发后续业务逻辑
        if ($status == 'success' || $status == '2') {
            // 发送通知到小程序或进行其他业务处理
            notifyMiniProgram($tradeNo, $status);
        }
        
        echo "SUCCESS";
    } else {
        writeLog("订单状态更新失败: $tradeNo");
        echo "FAIL";
    }
    
} catch (Exception $e) {
    writeLog("处理回调异常: " . $e->getMessage());
    echo "FAIL";
}

/**
 * 验证签名
 */
function verifySign($params) {
    // 京东公钥
    $jdPublicKey = 'YOUR_JD_PUBLIC_KEY';
    
    // 提取签名
    $sign = $params['sign'] ?? '';
    if (empty($sign)) {
        return false;
    }
    
    // 移除签名参数
    unset($params['sign']);
    
    // 按键名排序
    ksort($params);
    
    // 构建签名字符串
    $signStr = '';
    foreach ($params as $key => $value) {
        if ($value !== '' && $value !== null) {
            $signStr .= $key . '=' . $value . '&';
        }
    }
    $signStr = rtrim($signStr, '&');
    
    // 验证签名
    $publicKey = openssl_pkey_get_public($jdPublicKey);
    $result = openssl_verify($signStr, base64_decode($sign), $publicKey, OPENSSL_ALGO_SHA256);
    openssl_free_key($publicKey);
    
    return $result === 1;
}

/**
 * 更新订单状态
 */
function updateOrderStatus($tradeNo, $status, $jdTradeNo, $amount) {
    try {
        // 这里应该连接数据库更新订单状态
        // 示例代码，请根据实际数据库结构修改
        /*
        $pdo = new PDO('mysql:host=localhost;dbname=your_db', 'username', 'password');
        
        $sql = "UPDATE jd_orders SET status = ?, jd_trade_no = ?, paid_amount = ?, update_time = ? WHERE trade_no = ?";
        $stmt = $pdo->prepare($sql);
        $result = $stmt->execute([$status, $jdTradeNo, $amount, date('Y-m-d H:i:s'), $tradeNo]);
        
        return $result;
        */
        
        // 临时文件方式记录（生产环境请使用数据库）
        $orderFile = dirname(__FILE__) . '/orders/' . $tradeNo . '.json';
        $orderDir = dirname($orderFile);
        if (!is_dir($orderDir)) {
            mkdir($orderDir, 0755, true);
        }
        
        $orderData = [];
        if (file_exists($orderFile)) {
            $orderData = json_decode(file_get_contents($orderFile), true) ?: [];
        }
        
        $orderData['status'] = $status;
        $orderData['jd_trade_no'] = $jdTradeNo;
        $orderData['paid_amount'] = $amount;
        $orderData['update_time'] = date('Y-m-d H:i:s');
        
        return file_put_contents($orderFile, json_encode($orderData, JSON_UNESCAPED_UNICODE));
        
    } catch (Exception $e) {
        writeLog("更新订单状态异常: " . $e->getMessage());
        return false;
    }
}

/**
 * 通知小程序
 */
function notifyMiniProgram($tradeNo, $status) {
    try {
        // 这里可以通过WebSocket、推送等方式通知小程序
        // 或者小程序通过轮询方式查询订单状态
        
        // 示例：记录通知日志
        writeLog("通知小程序支付结果: $tradeNo => $status");
        
        // 如果有推送服务，可以在这里调用
        // pushToMiniProgram($tradeNo, $status);
        
    } catch (Exception $e) {
        writeLog("通知小程序异常: " . $e->getMessage());
    }
}
?>