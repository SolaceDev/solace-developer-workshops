# 🌤️ Welcome to the Solace Agent Mesh Workshop

This guide will walk you through setting up your **Solace Cloud Broker Trial Account** — a key step before running **Solace Agent Mesh (SAM)** during the workshop.

---

## 🪄 1. Create Your Solace Cloud Account

1. **Go to the Solace Cloud Console**  
   👉 [https://console.solace.cloud/](https://console.solace.cloud/)  
   ![Login Page](images/brokerlogin-page.png)

2. **Click “Sign Up”** and fill in your details.  
   ![Signup Page](images/brokersignup-page.png)

3. **Activate your account:**  
   - Check your email inbox for the activation message.  
   - Click **“Activate”** to confirm your registration.  
   ![Activation Email](images/brokeractivation-email.png)

4. **Sign in** using your email and password.  
   ![Sign In Page](images/brokersignin-page.png)

5. Once logged in, you’ll land on the **Solace PubSub+ Cloud Console** — your home for managing event-driven services.  
   ![Cloud Landing Page](images/brokerpubsub-cloud-landing.png)

---

## ⚙️ 2. Create a Solace Cloud Broker Service

1. **Launch the Cluster Manager:**  
   - From the main dashboard, scroll down and click **“Cluster Manager”**,  
     or  
   - Click the **Cluster Manager** icon on the left sidebar.  
   ![Cluster Manager](images/brokerlaunch-cluster-manager.png)

2. **Create a new service:**  
   Click **“Create Service”** and enter the following details:

   | **Field**         | **Value / Instruction**                                   |
   |--------------------|-----------------------------------------------------------|
   | **Service Name**   | Choose a name like `workshop`                              |
   | **Environment**    | Keep the default: `Default`                               |
   | **Cloud**          | Select your provider (e.g., **AWS**)                      |
   | **Region**         | Choose the closest region (e.g., `eks-ap-southeast-4`)    |
   | **Broker Release** | Keep default: `10.25`                                     |
   | **Service Type**   | Keep default: `Developer`                                 |

   ![Create Service](images/brokercreate-service.png)

3. **Click “Create Service”**  
   The provisioning process takes **2–3 minutes**.  
   Once complete, your broker will be ready with built-in support for **WebSocket (WS)**, **MQTT**, **SMR**, **REST**, and **AMQP** protocols.  

   ![Creating Service](images/brokercreating-service.png)

4. When setup finishes, you’ll see the **Service Details** page confirming successful creation.  
   ![Service Details](images/brokerservice-details.png)

---

## 🔗 3. Review Your Connection Details

You’re all set! 🎉  

Now open the **Connect** tab to view connection settings — organized by language and protocol.  
For this workshop, we’ll be using **Web Messaging (WebSockets)** for SAM connectivity.

![Broker Connection](images/brokerbroker-connection.png)

---

### ✅ You’ve Completed Your Broker Setup

You now have:
- A working **Solace Cloud Account**
- A **PubSub+ Broker Service** ready for use with SAM

> Next up: head to the [GitHub Codespaces Setup Guide](SAM_on_GitHub_Codespaces_Polished.md) to continue your SAM environment configuration.

---

**© 2025 Solace Developer Workshops**  
*For educational use during Solace Agent Mesh workshops.*
