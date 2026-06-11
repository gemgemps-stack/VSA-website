package sports.apparel.backend.features.clients;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import sports.apparel.backend.entity.Client;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ClientRepository extends JpaRepository<Client, UUID> {
    List<Client> findByVipTrue();

    List<Client> findByClientNameContainingIgnoreCase(String clientName);

    List<Client> findAllByOrderByCreatedAtAsc();

    Optional<Client> findByClientCode(String clientCode);
}
