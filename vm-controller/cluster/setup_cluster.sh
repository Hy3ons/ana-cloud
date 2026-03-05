#!/bin/bash
set -e

echo "🚀 Starting Environment Setup for VM Controller Project..."

# 1. Install K3s (Lightweight Kubernetes)
echo "🔹 Installing K3s..."
curl -sfL https://get.k3s.io | sh -

# Wait for K3s to be ready
echo "⏳ Waiting for K3s to initialize..."
sleep 15
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
chmod 644 /etc/rancher/k3s/k3s.yaml

# 2. Install KubeVirt (Virtualization Extensions)
echo "🔹 Fetching latest KubeVirt version..."
export KUBEVIRT_VERSION=$(curl -s https://api.github.com/repos/kubevirt/kubevirt/releases/latest | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')
echo "   KubeVirt Version: $KUBEVIRT_VERSION"

echo "🔹 Installing KubeVirt Operator..."
kubectl create -f https://github.com/kubevirt/kubevirt/releases/download/${KUBEVIRT_VERSION}/kubevirt-operator.yaml

echo "🔹 Installing KubeVirt Custom Resource (CR)..."
kubectl create -f https://github.com/kubevirt/kubevirt/releases/download/${KUBEVIRT_VERSION}/kubevirt-cr.yaml

# 3. Install virtctl (CLI for KubeVirt)
echo "🔹 Installing virtctl CLI..."
curl -L -o virtctl https://github.com/kubevirt/kubevirt/releases/download/${KUBEVIRT_VERSION}/virtctl-${KUBEVIRT_VERSION}-linux-amd64
chmod +x virtctl
mv virtctl /usr/local/bin/

# 4. Install CDI (Containerized Data Importer)
echo "🔹 Fetching latest CDI version..."
export CDI_VERSION=$(curl -s https://api.github.com/repos/kubevirt/containerized-data-importer/releases/latest | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')
echo "   CDI Version: $CDI_VERSION"

echo "🔹 Installing CDI Operator..."
kubectl create -f https://github.com/kubevirt/containerized-data-importer/releases/download/${CDI_VERSION}/cdi-operator.yaml

echo "🔹 Installing CDI Custom Resource (CR)..."
kubectl create -f https://github.com/kubevirt/containerized-data-importer/releases/download/${CDI_VERSION}/cdi-cr.yaml

echo "✅ Installation Completed Successfully!"
echo "   - K3s, KubeVirt, virtctl, and CDI have been installed."
echo "   - Config file is at: /etc/rancher/k3s/k3s.yaml"

echo "Start to Setup Backend..."
