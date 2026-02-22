// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * IncidentRegistry stores minimal immutable data for civic incidents.
 * Images and large metadata should be stored off-chain (e.g., IPFS).
 * Prevents duplicate incidents using hash-based verification.
 */
contract IncidentRegistry {
    struct Incident {
        bytes32 hash;           // keccak256 of canonical incident JSON
        string title;           // brief title for convenience
        address reporter;       // msg.sender who registered
        uint256 timestamp;      // block timestamp when registered
        bytes32 locationKey;    // geohash-derived key (bytes32)
        string ipfsCid;         // optional IPFS CID for metadata/media
    }

    uint256 public nextId = 1;
    mapping(uint256 => Incident) public incidents;      // id => Incident
    mapping(bytes32 => uint256) public idByLocationKey; // locationKey => id (0 if none)
    mapping(bytes32 => bool) public registeredIncidents; // hash => true if registered

    event IncidentRegistered(
        uint256 indexed id,
        bytes32 indexed hash,
        bytes32 indexed locationKey,
        address reporter,
        string title,
        string ipfsCid,
        uint256 timestamp
    );

    function registerIncident(
        bytes32 incidentHash,
        string calldata title,
        string calldata ipfsCid,
        bytes32 locationKey
    ) external returns (uint256 id) {
        require(incidentHash != bytes32(0), "INVALID_HASH");
        require(bytes(title).length > 0, "INVALID_TITLE");
        require(locationKey != bytes32(0), "INVALID_LOCATION");
        require(!registeredIncidents[incidentHash], "DUPLICATE_INCIDENT: Issue already exists on blockchain");
        require(idByLocationKey[locationKey] == 0, "ALREADY_REPORTED");

        id = nextId++;
        incidents[id] = Incident({
            hash: incidentHash,
            title: title,
            reporter: msg.sender,
            timestamp: block.timestamp,
            locationKey: locationKey,
            ipfsCid: ipfsCid
        });
        idByLocationKey[locationKey] = id;
        registeredIncidents[incidentHash] = true;

        emit IncidentRegistered(
            id,
            incidentHash,
            locationKey,
            msg.sender,
            title,
            ipfsCid,
            block.timestamp
        );
    }

    function getIncidentHash(uint256 id) external view returns (bytes32) {
        return incidents[id].hash;
    }

    function isIncidentRegistered(bytes32 incidentHash) external view returns (bool) {
        return registeredIncidents[incidentHash];
    }
}
