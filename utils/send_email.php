<?php 
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    try{
        include_once('phpmailer/class.phpmailer.php');
        require_once('phpmailer/class.smtp.php');

        $postdata = file_get_contents("php://input");
        $request = json_decode($postdata);

        $name = $request->name;
        $patent_id = $request->patent_id;
        $email = $request->email;
        $message = $request->message;

        // $name = trim($_POST["name"]);
        // $patent_id = trim($_POST["patent_id"]);
        // $email = trim($_POST["email"]);
        // $message = trim($_POST["message"]);

        $mail = new PHPMailer();

        $email_body = "";
        $email_body = $email_body . "Name: " . $name . "<br>";
        $email_body = $email_body . "Patent ID: " . $patent_id . "<br>";
        $email_body = $email_body . "Email: " . $email . "<br>";
        $email_body = $email_body . "Message: " . $message;

        $mail->Host = 'localhost';
        $mail->SetFrom($email, $name);
        $address = "patrick.sedivy@rbatechs.com";
        $mail->AddAddress($address, "Technology request");
        $mail->Subject    = "Request about technology ". $technology_id . "by" . $name;
        $mail->MsgHTML($email_body);

        if(!$mail->Send()) {
          echo "Didn't send...";
          exit;
        }

        echo "Sent!";
        exit;
    } catch (Exception $e) {
        $message = $e->getMessage();
        echo "Error... - " . $message;
    }
}
?>