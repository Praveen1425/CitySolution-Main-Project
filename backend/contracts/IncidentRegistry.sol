// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IncidentRegistry
 * @dev Smart contract for registering and verifying civic incidents on blockchain
 * Provides immutable record-keeping with location-based uniqueness checks
 */
contract IncidentRegistry {
    // Struct to store incident data
    struct Incident {
        bytes32 hash;           // keccak256 hash of incident data
        string ipfsCID;         // IPFS content identifier for additional data
        address reporter;       // Address of the incident reporter
        uint256 timestamp;      // Block timestamp when registered
        bytes32 locationKey;    // Geohash-based location key for uniqueness
    }

    // Mapping from incident ID to incident data
    mapping(uint256 => Incident) public incidents;

    // Mapping from location key to incident ID (for uniqueness checking)
    mapping(bytes32 => uint256) public locationToId;

    // Counter for incident IDs
    uint256 public nextId = 1;

    // Events
    event IncidentRegistered(
        uint256 indexed id,
        bytes32 indexed hash,
        string ipfsCID,
        address indexed reporter,
        uint256 timestamp
    );

    /**
     * @dev Register a new incident
     * @param _hash keccak256 hash of the incident data
     * @param _ipfsCID IPFS content identifier (can be empty)
     * @param _locationKey Geohash-based location key for uniqueness
     * @return incidentId The ID of the newly registered incident
     */
    function registerIncident(
        bytes32 _hash,
        string memory _ipfsCID,
        bytes32 _locationKey
    ) external returns (uint256) {
        require(_hash != bytes32(0), "Hash cannot be zero");
        require(_locationKey != bytes32(0), "Location key cannot be zero");

        // Check if location already has an incident
        require(locationToId[_locationKey] == 0, "ALREADY_REPORTED: Location already has an incident");

        uint256 incidentId = nextId++;

        incidents[incidentId] = Incident({
            hash: _hash,
            ipfsCID: _ipfsCID,
            reporter: msg.sender,
            timestamp: block.timestamp,
            locationKey: _locationKey
        });

        locationToId[_locationKey] = incidentId;

        emit IncidentRegistered(incidentId, _hash, _ipfsCID, msg.sender, block.timestamp);

        return incidentId;
    }

    /**
     * @dev Get the hash of a specific incident
     * @param id Incident ID
     * @return hash The keccak256 hash of the incident
     */
    function getIncidentHash(uint256 id) external view returns (bytes32) {
        require(id > 0 && id < nextId, "Invalid incident ID");
        return incidents[id].hash;
    }

    /**
     * @dev Get the incident ID for a specific location
     * @param locationKey Geohash-based location key
     * @return incidentId The ID of the incident at this location (0 if none)
     */
    function getIdByLocation(bytes32 locationKey) external view returns (uint256) {
        return locationToId[locationKey];
    }

    /**
     * @dev Get incident details
     * @param id Incident ID
     * @return hash, ipfsCID, reporter, timestamp, locationKey
     */
    function getIncident(uint256 id) external view returns (
        bytes32 hash,
        string memory ipfsCID,
        address reporter,
        uint256 timestamp,
        bytes32 locationKey
    ) {
        require(id > 0 && id < nextId, "Invalid incident ID");
        Incident memory incident = incidents[id];
        return (
            incident.hash,
            incident.ipfsCID,
            incident.reporter,
            incident.timestamp,
            incident.locationKey
        );
    }
}
