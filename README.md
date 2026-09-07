# React + Node.js + MongoDB CI/CD Project with Jenkins and Kubernetes

## Project Overview

This project demonstrates a complete CI/CD deployment flow using **Jenkins**, **Docker**, **Trivy**, **Docker Registry**, and **Kubernetes/Minikube**.

The application contains:

| Component | Technology |
| --- | --- |
| Frontend | React |
| Backend API | Node.js Express |
| Database | MongoDB |
| CI/CD Tool | Jenkins |
| Containerization | Docker |
| Image Scanning | Trivy |
| Registry | Docker Hub or private Docker registry |
| Deployment Platform | Kubernetes or Minikube |
| Deployment Strategy | Rolling Update |
| Rollback | Kubernetes rollout undo |

## Architecture Diagram

```text
Developer
   |
   | Push Code
   v
Git Repository
   |
   | Jenkins Webhook / Manual Build
   v
Jenkins Master
   |
   | Orchestrates Pipeline
   v
Jenkins Build Node
   |
   | Build Docker Images
   | Scan Images using Trivy
   | Push Images to Docker Registry
   v
Docker Registry
   |
   | Pull Images
   v
Minikube Target Instance
   |
   | kubectl apply / kubectl set image
   v
Kubernetes Cluster
   |
   |-----------------------------|
   | React Frontend Pods         |
   | Node.js Backend API Pods    |
   | MongoDB Pod + PVC           |
   |-----------------------------|
   |
   v
User Browser
```

## Deployment Flow

| Step | Description |
| --- | --- |
| 1 | Developer pushes code to Git repository |
| 2 | Jenkins pipeline starts |
| 3 | Jenkins build node builds Docker images |
| 4 | Trivy scans Docker images |
| 5 | Docker images are pushed to registry |
| 6 | Jenkins deploy stage runs on Minikube target instance |
| 7 | Kubernetes pulls latest images |
| 8 | Kubernetes performs rolling update |
| 9 | If deployment fails, rollback is triggered automatically |

## Infrastructure Design

| Machine | Purpose |
| --- | --- |
| Jenkins Master | Controls and triggers Jenkins pipeline |
| Jenkins Build Node | Builds Docker images, scans images, pushes images |
| Minikube Target Instance | Runs Minikube, kubectl, and Kubernetes workloads |

## Jenkins Node Labels

| Node | Suggested Label |
| --- | --- |
| Jenkins Build Node | `docker-node` |
| Minikube Target Instance | `minikube-target` |

## Project Directory Structure

```text
react-node-mongo-cicd/
├── backend/
│   ├── server.js
│   ├── package.json
│   └── Dockerfile
├── frontend/
│   ├── package.json
│   ├── Dockerfile
│   ├── nginx.conf
│   └── src/
│       └── App.js
├── k8s/
│   ├── mongo-pvc.yaml
│   ├── mongo-deployment.yaml
│   ├── mongo-service.yaml
│   ├── backend-deployment.yaml
│   ├── backend-service.yaml
│   ├── frontend-deployment.yaml
│   └── frontend-service.yaml
├── Jenkinsfile
└── README.md
```

## Prerequisites

Install the following tools before starting:

| Tool | Required On |
| --- | --- |
| Git | Jenkins build node |
| Docker | Jenkins build node and Minikube target |
| Jenkins | Jenkins master |
| Trivy | Jenkins build node |
| kubectl | Minikube target instance |
| Minikube | Minikube target instance |
| Docker Hub account | For image push and pull |

## Required Jenkins Credentials

Create these credentials in Jenkins.

| Credential ID | Type | Purpose |
| --- | --- | --- |
| `dockerhub-creds` | Username with password | Login to Docker Hub |
| `github-creds` | Username/token or SSH key | Pull source code from GitHub if repository is private |

## Docker Images Used

Replace `your-dockerhub-user` with your actual Docker Hub username.

| Application | Image Name |
| --- | --- |
| Frontend | `your-dockerhub-user/react-ui` |
| Backend | `your-dockerhub-user/node-api` |

## Backend Application

### `backend/server.js`

```javascript
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const mongoUrl = process.env.MONGO_URL || "mongodb://mongo-service:27017/userdb";

mongoose
  .connect(mongoUrl)
  .then(() => console.log("Connected to MongoDB"))
  .catch((error) => console.error("MongoDB connection error:", error));

const UserSchema = new mongoose.Schema({
  name: String,
  email: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const User = mongoose.model("User", UserSchema);

app.get("/", (req, res) => {
  res.send("Node.js API is running");
});

app.post("/users", async (req, res) => {
  try {
    const { name, email } = req.body;

    const user = new User({
      name,
      email
    });

    await user.save();

    res.status(201).json({
      message: "User saved successfully",
      user
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to save user",
      error: error.message
    });
  }
});

app.get("/users", async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch users",
      error: error.message
    });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Backend API running on port ${PORT}`);
});
```

### `backend/package.json`

```json
{
  "name": "node-api",
  "version": "1.0.0",
  "description": "Simple Node.js API for Jenkins Kubernetes CI/CD demo",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^4.18.3",
    "mongoose": "^8.2.1"
  }
}
```

### `backend/Dockerfile`

```Dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package.json .

RUN npm install

COPY server.js .

EXPOSE 5000

CMD ["npm", "start"]
```

## Frontend Application

### `frontend/src/App.js`

```javascript
import React, { useEffect, useState } from "react";

function App() {
  const [formData, setFormData] = useState({
    name: "",
    email: ""
  });

  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState("");

  const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:5000";

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${apiUrl}/users`);
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      setMessage("Failed to fetch users");
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleChange = (event) => {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      const response = await fetch(`${apiUrl}/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setMessage("User saved successfully");
        setFormData({
          name: "",
          email: ""
        });
        fetchUsers();
      } else {
        setMessage("Failed to save user");
      }
    } catch (error) {
      setMessage("Backend API not reachable");
    }
  };

  return (
    <div style={{ fontFamily: "Arial", margin: "40px" }}>
      <h1>React + Node.js + MongoDB CI/CD Demo</h1>

      <form onSubmit={handleSubmit}>
        <div>
          <input
            type="text"
            name="name"
            placeholder="Enter name"
            value={formData.name}
            onChange={handleChange}
            required
            style={{ padding: "10px", marginRight: "10px" }}
          />

          <input
            type="email"
            name="email"
            placeholder="Enter email"
            value={formData.email}
            onChange={handleChange}
            required
            style={{ padding: "10px", marginRight: "10px" }}
          />

          <button type="submit" style={{ padding: "10px" }}>
            Save User
          </button>
        </div>
      </form>

      <p>{message}</p>

      <h2>Saved Users</h2>

      <ul>
        {users.map((user) => (
          <li key={user._id}>
            {user.name} - {user.email}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
```

### `frontend/package.json`

```json
{
  "name": "react-ui",
  "version": "1.0.0",
  "description": "React frontend for Jenkins Kubernetes CI/CD demo",
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-scripts": "5.0.1"
  }
}
```

### `frontend/nginx.conf`

```nginx
server {
    listen 80;

    server_name localhost;

    location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files $uri /index.html;
    }
}
```

### `frontend/Dockerfile`

```Dockerfile
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json .

RUN npm install

COPY src ./src

RUN npm run build

FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

## Kubernetes Manifests

## MongoDB PVC

### `k8s/mongo-pvc.yaml`

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: mongo-pvc
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi
```

## MongoDB Deployment

### `k8s/mongo-deployment.yaml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mongo
spec:
  replicas: 1
  selector:
    matchLabels:
      app: mongo
  template:
    metadata:
      labels:
        app: mongo
    spec:
      containers:
        - name: mongo
          image: mongo:7
          ports:
            - containerPort: 27017
          volumeMounts:
            - name: mongo-storage
              mountPath: /data/db
      volumes:
        - name: mongo-storage
          persistentVolumeClaim:
            claimName: mongo-pvc
```

## MongoDB Service

### `k8s/mongo-service.yaml`

```yaml
apiVersion: v1
kind: Service
metadata:
  name: mongo-service
spec:
  type: ClusterIP
  selector:
    app: mongo
  ports:
    - port: 27017
      targetPort: 27017
```

## Backend Deployment

### `k8s/backend-deployment.yaml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: node-api
spec:
  replicas: 3
  revisionHistoryLimit: 5
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 1
  selector:
    matchLabels:
      app: node-api
  template:
    metadata:
      labels:
        app: node-api
    spec:
      containers:
        - name: node-api
          image: your-dockerhub-user/node-api:latest
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 5000
          env:
            - name: MONGO_URL
              value: mongodb://mongo-service:27017/userdb
```

## Backend Service

### `k8s/backend-service.yaml`

```yaml
apiVersion: v1
kind: Service
metadata:
  name: node-api-service
spec:
  type: NodePort
  selector:
    app: node-api
  ports:
    - port: 5000
      targetPort: 5000
      nodePort: 30081
```

## Frontend Deployment

### `k8s/frontend-deployment.yaml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: react-ui
spec:
  replicas: 3
  revisionHistoryLimit: 5
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 1
  selector:
    matchLabels:
      app: react-ui
  template:
    metadata:
      labels:
        app: react-ui
    spec:
      containers:
        - name: react-ui
          image: your-dockerhub-user/react-ui:latest
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 80
```

## Frontend Service

### `k8s/frontend-service.yaml`

```yaml
apiVersion: v1
kind: Service
metadata:
  name: react-ui-service
spec:
  type: NodePort
  selector:
    app: react-ui
  ports:
    - port: 80
      targetPort: 80
      nodePort: 30080
```

## Jenkins Pipeline

### `Jenkinsfile`

```groovy
pipeline {
    agent none

    environment {
        DOCKERHUB_USER = "your-dockerhub-user"
        BACKEND_IMAGE = "${DOCKERHUB_USER}/node-api"
        FRONTEND_IMAGE = "${DOCKERHUB_USER}/react-ui"
        IMAGE_TAG = "${BUILD_NUMBER}"
    }

    stages {
        stage('Checkout Code') {
            agent { label 'docker-node' }
            steps {
                checkout scm
            }
        }

        stage('Build Backend Image') {
            agent { label 'docker-node' }
            steps {
                sh '''
                    docker build -t $BACKEND_IMAGE:$IMAGE_TAG ./backend
                '''
            }
        }

        stage('Build Frontend Image') {
            agent { label 'docker-node' }
            steps {
                sh '''
                    docker build -t $FRONTEND_IMAGE:$IMAGE_TAG ./frontend
                '''
            }
        }

        stage('Scan Backend Image') {
            agent { label 'docker-node' }
            steps {
                sh '''
                    trivy image --exit-code 0 --severity HIGH,CRITICAL $BACKEND_IMAGE:$IMAGE_TAG
                '''
            }
        }

        stage('Scan Frontend Image') {
            agent { label 'docker-node' }
            steps {
                sh '''
                    trivy image --exit-code 0 --severity HIGH,CRITICAL $FRONTEND_IMAGE:$IMAGE_TAG
                '''
            }
        }

        stage('Push Images') {
            agent { label 'docker-node' }
            steps {
                withCredentials([usernamePassword(credentialsId: 'dockerhub-creds', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                    sh '''
                        echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin
                        docker push $BACKEND_IMAGE:$IMAGE_TAG
                        docker push $FRONTEND_IMAGE:$IMAGE_TAG
                    '''
                }
            }
        }

        stage('Deploy to Minikube') {
            agent { label 'minikube-target' }
            steps {
                sh '''
                    docker pull $BACKEND_IMAGE:$IMAGE_TAG
                    docker pull $FRONTEND_IMAGE:$IMAGE_TAG

                    minikube image load $BACKEND_IMAGE:$IMAGE_TAG
                    minikube image load $FRONTEND_IMAGE:$IMAGE_TAG

                    kubectl apply -f k8s/mongo-pvc.yaml
                    kubectl apply -f k8s/mongo-deployment.yaml
                    kubectl apply -f k8s/mongo-service.yaml

                    kubectl apply -f k8s/backend-deployment.yaml
                    kubectl apply -f k8s/backend-service.yaml

                    kubectl apply -f k8s/frontend-deployment.yaml
                    kubectl apply -f k8s/frontend-service.yaml

                    kubectl set image deployment/node-api node-api=$BACKEND_IMAGE:$IMAGE_TAG
                    kubectl set image deployment/react-ui react-ui=$FRONTEND_IMAGE:$IMAGE_TAG

                    kubectl rollout status deployment/node-api --timeout=180s
                    kubectl rollout status deployment/react-ui --timeout=180s
                '''
            }
        }
    }

    post {
        failure {
            node('minikube-target') {
                sh '''
                    echo "Deployment failed. Starting rollback..."

                    kubectl rollout undo deployment/node-api || true
                    kubectl rollout undo deployment/react-ui || true

                    kubectl rollout status deployment/node-api --timeout=180s || true
                    kubectl rollout status deployment/react-ui --timeout=180s || true
                '''
            }
        }

        success {
            echo "Deployment completed successfully."
        }
    }
}
```

## Start from Scratch

## Step 1: Create Git Repository

Create a new GitHub repository.

Example repository name:

```bash
react-node-mongo-cicd
```

Clone it locally:

```bash
git clone https://github.com/your-github-user/react-node-mongo-cicd.git
cd react-node-mongo-cicd
```

## Step 2: Create Project Folders

```bash
mkdir backend frontend k8s
mkdir frontend/src
```

Create all files using the structure shown above.

## Step 3: Update Docker Hub Username

Replace this value in all files:

```text
your-dockerhub-user
```

With your actual Docker Hub username.

Example:

```text
mydockeruser
```

Files to update:

| File | Required Change |
| --- | --- |
| `k8s/backend-deployment.yaml` | Update backend image |
| `k8s/frontend-deployment.yaml` | Update frontend image |
| `Jenkinsfile` | Update `DOCKERHUB_USER` |

## Step 4: Push Code to GitHub

```bash
git add .
git commit -m "Initial Jenkins Kubernetes CI/CD project"
git branch -M main
git push origin main
```

## Step 5: Prepare Jenkins Build Node

Install Docker:

```bash
sudo apt update
sudo apt install docker.io -y
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker jenkins
```

Install Trivy:

```bash
sudo apt-get install wget apt-transport-https gnupg lsb-release -y
wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | sudo apt-key add -
echo deb https://aquasecurity.github.io/trivy-repo/deb $(lsb_release -sc) main | sudo tee /etc/apt/sources.list.d/trivy.list
sudo apt update
sudo apt install trivy -y
```

Restart Jenkins agent or reconnect the Jenkins node after adding the Jenkins user to the Docker group.

## Step 6: Prepare Minikube Target Instance

Install Docker:

```bash
sudo apt update
sudo apt install docker.io -y
sudo systemctl enable docker
sudo systemctl start docker
```

Install kubectl:

```bash
curl -LO "https://dl.k8s.io/release/v1.30.0/bin/linux/amd64/kubectl"
chmod +x kubectl
sudo mv kubectl /usr/local/bin/
```

Install Minikube:

```bash
curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
chmod +x minikube-linux-amd64
sudo mv minikube-linux-amd64 /usr/local/bin/minikube
```

Start Minikube:

```bash
minikube start --driver=docker
```

Verify Minikube:

```bash
kubectl get nodes
```

## Step 7: Configure Jenkins Nodes

In Jenkins:

1. Go to **Manage Jenkins**
2. Go to **Nodes**
3. Add or verify build node
4. Add label:

```text
docker-node
```

5. Add or verify Minikube target node
6. Add label:

```text
minikube-target
```

## Step 8: Configure Jenkins Credentials

Create Docker Hub credentials:

1. Go to **Manage Jenkins**
2. Go to **Credentials**
3. Add credential
4. Select **Username with password**
5. Use this ID:

```text
dockerhub-creds
```

## Step 9: Create Jenkins Pipeline Job

Create a new Jenkins pipeline job:

| Field | Value |
| --- | --- |
| Job Type | Pipeline |
| Pipeline Definition | Pipeline script from SCM |
| SCM | Git |
| Repository URL | Your GitHub repository URL |
| Branch | `main` |
| Script Path | `Jenkinsfile` |

Save and run the build.

## Manual Docker Test

Use this only if you want to test Docker images manually.

### Build Backend Image

```bash
docker build -t your-dockerhub-user/node-api:v1 ./backend
```

### Build Frontend Image

```bash
docker build -t your-dockerhub-user/react-ui:v1 ./frontend
```

### Scan Images

```bash
trivy image your-dockerhub-user/node-api:v1
trivy image your-dockerhub-user/react-ui:v1
```

### Push Images

```bash
docker login
docker push your-dockerhub-user/node-api:v1
docker push your-dockerhub-user/react-ui:v1
```

## Manual Kubernetes Deployment

Use this only if you want to deploy manually without Jenkins.

```bash
kubectl apply -f k8s/mongo-pvc.yaml
kubectl apply -f k8s/mongo-deployment.yaml
kubectl apply -f k8s/mongo-service.yaml

kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/backend-service.yaml

kubectl apply -f k8s/frontend-deployment.yaml
kubectl apply -f k8s/frontend-service.yaml
```

Update backend image:

```bash
kubectl set image deployment/node-api node-api=your-dockerhub-user/node-api:v1
```

Update frontend image:

```bash
kubectl set image deployment/react-ui react-ui=your-dockerhub-user/react-ui:v1
```

Check rollout status:

```bash
kubectl rollout status deployment/node-api
kubectl rollout status deployment/react-ui
```

## Access Application

Get the frontend service URL:

```bash
minikube service react-ui-service --url
```

Open the generated URL in your browser.

Example:

```text
http://192.168.49.2:30080
```

Backend API can be accessed using:

```bash
minikube service node-api-service --url
```

Example backend API URL:

```text
http://192.168.49.2:30081
```

## Useful Kubernetes Commands

Check all resources:

```bash
kubectl get all
```

Check pods:

```bash
kubectl get pods
```

Check services:

```bash
kubectl get svc
```

Check deployments:

```bash
kubectl get deployments
```

Check pod logs:

```bash
kubectl logs deployment/node-api
```

Describe a pod:

```bash
kubectl describe pod pod-name
```

## Rolling Deployment

This project uses Kubernetes rolling deployment strategy.

Backend deployment strategy:

```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxSurge: 1
    maxUnavailable: 1
```

Frontend deployment strategy:

```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxSurge: 1
    maxUnavailable: 1
```

This means Kubernetes updates pods gradually instead of stopping all pods at once.

## Rollback

If deployment fails, Jenkins automatically executes rollback.

Manual rollback commands:

```bash
kubectl rollout undo deployment/node-api
kubectl rollout undo deployment/react-ui
```

Check rollout history:

```bash
kubectl rollout history deployment/node-api
kubectl rollout history deployment/react-ui
```

Check rollback status:

```bash
kubectl rollout status deployment/node-api
kubectl rollout status deployment/react-ui
```

## Clean Up Kubernetes Resources

Delete frontend:

```bash
kubectl delete -f k8s/frontend-service.yaml
kubectl delete -f k8s/frontend-deployment.yaml
```

Delete backend:

```bash
kubectl delete -f k8s/backend-service.yaml
kubectl delete -f k8s/backend-deployment.yaml
```

Delete MongoDB:

```bash
kubectl delete -f k8s/mongo-service.yaml
kubectl delete -f k8s/mongo-deployment.yaml
kubectl delete -f k8s/mongo-pvc.yaml
```

## Common Issues and Fixes

| Issue | Reason | Fix |
| --- | --- | --- |
| Jenkins cannot run Docker | Jenkins user not in Docker group | Run `sudo usermod -aG docker jenkins` and reconnect agent |
| ImagePullBackOff | Kubernetes cannot pull image | Check image name, tag, and Docker Hub access |
| CrashLoopBackOff | Application is crashing | Check logs using `kubectl logs` |
| MongoDB not connecting | Service name or port issue | Verify `mongo-service` and port `27017` |
| Frontend cannot call backend | API URL mismatch | Verify backend service URL and CORS settings |
| Rollout stuck | New pods are not becoming ready | Check pod logs and describe pods |

## Interview Explanation

You can explain this project as:

```text
This project demonstrates a complete CI/CD pipeline using Jenkins and Kubernetes.
The application has React frontend, Node.js backend, and MongoDB database.
Jenkins builds Docker images for frontend and backend, scans them using Trivy,
pushes them to Docker Hub, and deploys them to Minikube using Kubernetes manifests.
The deployment uses rolling update strategy with three replicas.
If deployment fails, Jenkins automatically performs rollback using kubectl rollout undo.
```

# Image Description for Architecture Diagram

The architecture image should show a complete CI/CD flow from developer to Kubernetes.

## Suggested Image Elements

| Element | Description |
| --- | --- |
| Developer | Pushes code to GitHub |
| GitHub Repository | Stores application source code, Dockerfiles, Kubernetes YAML, and Jenkinsfile |
| Jenkins Master | Triggers and controls pipeline stages |
| Jenkins Build Node | Builds Docker images, scans images using Trivy, and pushes images |
| Trivy | Performs security vulnerability scanning |
| Docker Registry | Stores frontend and backend Docker images |
| Minikube Target Instance | Runs Minikube and kubectl commands |
| Kubernetes Cluster | Runs React frontend, Node.js backend, and MongoDB |
| React Pods | Serve frontend UI |
| Node.js Pods | Serve REST API |
| MongoDB Pod | Stores user data |
| User Browser | Accesses frontend using NodePort service |

## Suggested Image Flow

```text
Developer -> GitHub -> Jenkins Master -> Jenkins Build Node -> Trivy Scan -> Docker Registry -> Minikube Target -> Kubernetes Pods -> User Browser
```

## Suggested Image Title

```text
Jenkins CI/CD Pipeline for React, Node.js, MongoDB on Kubernetes
```
