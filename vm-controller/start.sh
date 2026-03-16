go build -ldflags "-s -w" -o main ./cmd/server/main.go

cp ./app.service /etc/systemd/system/myapp.service

sudo systemctl daemon-reload
sudo systemctl enable myapp.service
sudo systemctl start myapp.service
