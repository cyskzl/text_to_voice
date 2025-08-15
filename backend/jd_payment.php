<?php
/**
 * 京东支付API接口
 * 由于微信小程序无法直接调起京东APP，采用WebView方式实现京东支付
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// 处理预检请求
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

class JDPayment {
    
    // 京东支付配置
    private $config = [
        'merchant_id' => 'YOUR_JD_MERCHANT_ID',  // 京东商户号
        'app_id' => 'YOUR_JD_APP_ID',            // 京东应用ID
        'private_key' => 'YOUR_PRIVATE_KEY',      // 私钥
        'public_key' => 'JD_PUBLIC_KEY',          // 京东公钥
        'gateway_url' => 'https://paygate.jd.com/service/unified.trade.query', // 京东支付网关
        'notify_url' => 'https://your-domain.com/backend/jd_notify.php',  // 支付回调地址
        'return_url' => 'https://your-domain.com/backend/jd_return.php'   // 支付返回地址
    ];
    
    /**
     * 创建支付订单
     */
    public function createPayOrder($params) {
        try {
            // 订单参数验证
            if (empty($params['out_trade_no']) || empty($params['total_amount']) || empty($params['subject'])) {
                throw new Exception('订单参数不完整');
            }
            
            // 构建支付参数
            $payParams = [
                'version' => '2.0',
                'merchant' => $this->config['merchant_id'],
                'tradeNum' => $params['out_trade_no'],
                'tradeName' => $params['subject'],
                'tradeDesc' => $params['body'] ?? $params['subject'],
                'tradeTime' => date('YmdHis'),
                'amount' => number_format($params['total_amount'], 2, '.', ''),
                'currency' => 'CNY',
                'note' => $params['note'] ?? '',
                'callbackUrl' => $this->config['notify_url'],
                'notifyUrl' => $this->config['notify_url'],
                'ip' => $this->getClientIP(),
                'userId' => $params['user_id'] ?? ''
            ];
            
            // 生成签名
            $payParams['sign'] = $this->generateSign($payParams);
            
            // 构建支付URL（用于WebView）
            $payUrl = $this->buildPayUrl($payParams);
            
            // 保存订单信息到数据库
            $this->saveOrder($payParams);
            
            return [
                'code' => 0,
                'message' => 'success',
                'data' => [
                    'pay_url' => $payUrl,
                    'trade_no' => $params['out_trade_no'],
                    'timestamp' => time()
                ]
            ];
            
        } catch (Exception $e) {
            return [
                'code' => -1,
                'message' => $e->getMessage(),
                'data' => null
            ];
        }
    }
    
    /**
     * 查询支付状态
     */
    public function queryPayStatus($tradeNo) {
        try {
            $params = [
                'version' => '2.0',
                'merchant' => $this->config['merchant_id'],
                'tradeNum' => $tradeNo
            ];
            
            $params['sign'] = $this->generateSign($params);
            
            // 发送查询请求到京东
            $response = $this->sendRequest($this->config['gateway_url'], $params);
            
            if ($response && isset($response['code']) && $response['code'] == '000000') {
                return [
                    'code' => 0,
                    'message' => 'success',
                    'data' => [
                        'trade_status' => $response['tradeStatus'],
                        'trade_no' => $tradeNo,
                        'amount' => $response['amount'] ?? 0
                    ]
                ];
            } else {
                throw new Exception('查询支付状态失败');
            }
            
        } catch (Exception $e) {
            return [
                'code' => -1,
                'message' => $e->getMessage(),
                'data' => null
            ];
        }
    }
    
    /**
     * 生成签名
     */
    private function generateSign($params) {
        // 移除空值和签名参数
        $params = array_filter($params, function($value) {
            return $value !== '' && $value !== null;
        });
        unset($params['sign']);
        
        // 按键名排序
        ksort($params);
        
        // 构建签名字符串
        $signStr = '';
        foreach ($params as $key => $value) {
            $signStr .= $key . '=' . $value . '&';
        }
        $signStr = rtrim($signStr, '&');
        
        // 使用私钥签名
        return $this->rsaSign($signStr);
    }
    
    /**
     * RSA签名
     */
    private function rsaSign($data) {
        $privateKey = openssl_pkey_get_private($this->config['private_key']);
        openssl_sign($data, $signature, $privateKey, OPENSSL_ALGO_SHA256);
        openssl_free_key($privateKey);
        return base64_encode($signature);
    }
    
    /**
     * 构建支付URL
     */
    private function buildPayUrl($params) {
        $baseUrl = 'https://h5pay.jd.com/jdpay/saveOrder';
        return $baseUrl . '?' . http_build_query($params);
    }
    
    /**
     * 发送HTTP请求
     */
    private function sendRequest($url, $params) {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($params));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($httpCode == 200) {
            return json_decode($response, true);
        }
        
        return false;
    }
    
    /**
     * 保存订单信息
     */
    private function saveOrder($params) {
        // 这里应该保存到数据库
        // 示例代码，请根据实际数据库结构修改
        /*
        $sql = "INSERT INTO jd_orders (trade_no, trade_name, amount, status, create_time) VALUES (?, ?, ?, ?, ?)";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $params['tradeNum'],
            $params['tradeName'],
            $params['amount'],
            'pending',
            date('Y-m-d H:i:s')
        ]);
        */
    }
    
    /**
     * 获取客户端IP
     */
    private function getClientIP() {
        $ip = '';
        if (!empty($_SERVER['HTTP_CLIENT_IP'])) {
            $ip = $_SERVER['HTTP_CLIENT_IP'];
        } elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
            $ip = $_SERVER['HTTP_X_FORWARDED_FOR'];
        } else {
            $ip = $_SERVER['REMOTE_ADDR'];
        }
        return $ip;
    }
}

// 处理API请求
$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

$jdPayment = new JDPayment();

if ($method == 'POST' && strpos($path, '/create_order') !== false) {
    // 创建支付订单
    $input = json_decode(file_get_contents('php://input'), true);
    $result = $jdPayment->createPayOrder($input);
    echo json_encode($result);
    
} elseif ($method == 'GET' && strpos($path, '/query_status') !== false) {
    // 查询支付状态
    $tradeNo = $_GET['trade_no'] ?? '';
    $result = $jdPayment->queryPayStatus($tradeNo);
    echo json_encode($result);
    
} else {
    echo json_encode([
        'code' => -1,
        'message' => '接口不存在',
        'data' => null
    ]);
}
?>