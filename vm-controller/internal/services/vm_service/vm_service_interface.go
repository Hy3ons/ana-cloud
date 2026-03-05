package vmservice

type CreateVmParams struct {
	Namespace  string
	VmName     string
	VmPassword string
	DnsHost    string
	VmSSHPort  int32
	VmImage    string
	UserID     uint
}
