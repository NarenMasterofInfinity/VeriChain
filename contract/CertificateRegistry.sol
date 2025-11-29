// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract CertificateRegistry {

    struct Certificate {
        string certHash;
        address issuedTo;
        address issuedBy;
        uint256 timestamp;
    }

    mapping(string => Certificate) public certificates;

    event CertificateIssued(
        string certHash,
        address indexed issuedTo,
        uint256 timestamp
    );

    function issueCertificate(string memory _certHash, address _student) public {
        require(bytes(certificates[_certHash].certHash).length == 0, "Certificate already exists");

        certificates[_certHash] = Certificate({
            certHash: _certHash,
            issuedTo: _student,
            issuedBy: msg.sender,
            timestamp: block.timestamp
        });

        emit CertificateIssued(_certHash, _student, block.timestamp);
    }

    function verifyCertificate(string memory _certHash)
        public view returns (bool, Certificate memory)
    {
        Certificate memory cert = certificates[_certHash];

        if (bytes(cert.certHash).length == 0)
            return (false, cert);

        return (true, cert);
    }
}
